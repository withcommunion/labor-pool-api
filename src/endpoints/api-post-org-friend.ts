import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { addFriendToOrg, getOrgById } from 'src/util/dynamo-org';

interface ExpectedPostBody {
  friendlyOrgId?: string;
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

    const orgId = event.pathParameters?.id;

    const { friendlyOrgId } = parseBody(event.body || '');
    if (!friendlyOrgId) {
      return generateReturn(500, {
        message: 'Failed to parse orgId from body',
        body: event.body,
        requiredFields: ['friendlyOrgId'],
      });
    }

    if (!orgId) {
      return generateReturn(500, {
        message: 'Missing orgId from path',
        body: orgId,
        requiredFields: ['orgId'],
      });
    }
    /**
     * TODO: Check if requesting user is manager of org
     * TODO: Eventually will need to ensure that both orgs want to be friends as well
      const claims = event.requestContext.authorizer?.jwt?.claims;
      // For some reason it can come through in two seperate ways
      const requestingUserId =
        claims &&
        ((claims.username as string) || (claims['cognito:username'] as string));
     */

    const mainOrg = await getOrgById(orgId);
    const friendlyOrg = await getOrgById(friendlyOrgId);

    if (!mainOrg || !friendlyOrg) {
      return generateReturn(404, {
        message: 'An Org was not found',
        requestingOrg: mainOrg,
        friendlyOrg,
      });
    }

    if (mainOrg === friendlyOrg) {
      return generateReturn(200, {
        message: 'You are befriending yourself!',
        requestingOrg: mainOrg.id,
        friendlyOrg: friendlyOrg.id,
      });
    }

    logger.verbose('Adding friendly orgId to org', {
      values: { mainOrg, friendlyOrgId },
    });

    if (mainOrg.friends.includes(friendlyOrgId)) {
      logger.info('Main Org is already friends with friendly org');
    } else {
      const savedOrg = await addFriendToOrg(orgId, friendlyOrgId);
      logger.info('Updated main org', { values: { savedOrg } });
      if (!savedOrg) {
        logger.info('Failed to save org', { values: { savedOrg } });
        return generateReturn(500, {
          message: 'Failed to save org',
          savedOrg,
        });
      }
    }

    if (friendlyOrg.friends.includes(orgId)) {
      logger.info('Friendly Org is already friends with main org');
    } else {
      const savedOrgFriend = await addFriendToOrg(friendlyOrgId, orgId);
      logger.info('Updated org friend', { values: { savedOrgFriend } });
      if (!savedOrgFriend) {
        logger.info('Failed to save org friend', {
          values: { savedOrgFriend },
        });
        return generateReturn(500, {
          message: 'Failed to save org friend',
          savedOrgFriend,
        });
      }
    }

    const returnValue = generateReturn(200, {
      success: true,
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

function parseBody(bodyString: string) {
  try {
    const body = JSON.parse(bodyString || '') as ExpectedPostBody;

    const friendlyOrgId = body.friendlyOrgId?.toLowerCase();

    return friendlyOrgId ? { friendlyOrgId } : {};
  } catch (error) {
    logger.error('Failed to parse body', {
      values: { error, body: bodyString },
    });
    console.log('Failed to parse body', error);
    return {};
  }
}
