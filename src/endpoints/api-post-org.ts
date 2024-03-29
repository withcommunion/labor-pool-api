import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { createOrg } from 'src/util/dynamo-org';
import { addOrgToUser } from 'src/util/dynamo-user';

interface ExpectedPostBody {
  name: string;
  ownerUrn: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phoneNumber?: string;
  email?: string;
  facebookHandle?: string;
  twitterHandle?: string;
  instagramHandle?: string;
  website?: string;
  logo?: string;
  description?: string;
}

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
) => {
  try {
    setDefaultLoggerMetaForApi(event, logger);

    logger.info('incomingEvent', { values: { event } });
    logger.verbose('incomingEventAuth', {
      values: { authorizer: event.requestContext.authorizer },
    });

    const claims = event.requestContext.authorizer?.jwt?.claims;
    // For some reason it can come through in two seperate ways
    const requestingUserId =
      claims &&
      ((claims.username as string) || (claims['cognito:username'] as string));

    /**
     * TODO: Handle when the name (id) is already taken
     */
    const org = parseBody(event.body || '', requestingUserId);
    if (!org || !org.name) {
      return generateReturn(500, {
        message: 'Failed to parse org from body',
        body: event.body,
        requiredFields: ['name'],
      });
    }

    const fullOrg = {
      ...org,
      primaryMembers: [requestingUserId],
    };

    logger.verbose('Creating org', { values: { org } });
    const savedOrg = await createOrg(org);
    if (!savedOrg) {
      logger.info('Failed to save org', { values: { savedOrg } });
      return generateReturn(500, {
        message: 'Failed to save org',
        org,
      });
    }
    logger.info('Created org', { values: { savedOrg } });

    logger.verbose('Adding org to user requesting user', {
      values: {
        requestingUserId,
        orgId: fullOrg.id,
      },
    });
    const updatedUser = await addOrgToUser(
      requestingUserId,
      fullOrg.id,
      'manager'
    );
    logger.info('Updated user', { values: { updatedUser } });

    const returnValue = generateReturn(200, {
      ...org,
    });
    logger.info('Returning', { values: returnValue });

    return returnValue;
  } catch (error) {
    logger.error('Failed to create org', {
      values: { error },
    });
    console.error('Failed to create org', error);
    return generateReturn(500, {
      message:
        'Something went wrong trying to save the organization, please try again.',
      error: error,
    });
  }
};

function parseBody(bodyString: string, creatingUserId: string) {
  try {
    const body = JSON.parse(bodyString || '') as ExpectedPostBody;

    const id = body.name && body.name.replace(/\s/g, '-').toLowerCase();
    const org = {
      id,
      name: body.name,
      ownerUrn: `urn:user:${creatingUserId}`,
      primaryMembers: [creatingUserId],
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2,
      city: body.city,
      state: body.state,
      zip: body.zip,
      country: body.country,
      phoneNumber: body.phoneNumber,
      email: body.email,
      facebookHandle: body.facebookHandle,
      twitterHandle: body.twitterHandle,
      instagramHandle: body.instagramHandle,
      website: body.website,
      logo: body.logo,
      description: body.description,
    };

    return org;
  } catch (error) {
    logger.error('Failed to parse body', {
      values: { error, body: bodyString },
    });
    console.log('Failed to parse body', error);
    return null;
  }
}
