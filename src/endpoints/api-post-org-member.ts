import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { addMemberToOrg, getOrgById } from 'src/util/dynamo-org';
import { addOrgToUser, getUserById } from 'src/util/dynamo-user';

interface ExpectedPostBody {
  memberId?: string;
  role?: string;
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

    const { memberId, role } = parseBody(event.body || '');
    if (!memberId) {
      return generateReturn(500, {
        message: 'Failed to parse memberId from body',
        body: event.body,
        requiredFields: ['memberId'],
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
     * TODO: Will need joinCode logic
     */

    const org = await getOrgById(orgId);
    const member = await getUserById(memberId);

    if (!org || !member) {
      return generateReturn(404, {
        message: 'The org or member was not found',
        org,
        member,
      });
    }

    logger.verbose('Adding member to org', {
      values: { org, member },
    });

    if (org.primaryMembers.includes(memberId)) {
      logger.info('Org already contains member');
    } else {
      const savedOrg = await addMemberToOrg(orgId, memberId);
      logger.info('Updated org', { values: { savedOrg } });
      if (!savedOrg) {
        logger.info('Failed to save org', { values: { savedOrg } });
        return generateReturn(500, {
          message: 'Failed to save org',
          savedOrg,
        });
      }
    }

    if (member.orgs.includes(orgId)) {
      logger.info('Friendly Org is already friends with main org');
    } else {
      const savedMember = await addOrgToUser(memberId, orgId, role);
      logger.info('Updated user', { values: { savedMember } });
      if (!savedMember) {
        logger.info('Failed to save org friend', {
          values: { savedMember },
        });
        return generateReturn(500, {
          message: 'Failed to save org friend',
          savedMember,
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

    const memberId = body.memberId?.toLowerCase();
    const role = body.role?.toLowerCase();

    return { memberId, role };
  } catch (error) {
    logger.error('Failed to parse body', {
      values: { error, body: bodyString },
    });
    console.log('Failed to parse body', error);
    return {};
  }
}
