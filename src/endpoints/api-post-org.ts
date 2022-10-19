import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { createOrg } from 'src/util/dynamo-org';

interface ExpectedPostBody {
  name: string;
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
      primaryMembers: [creatingUserId],
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
