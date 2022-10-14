import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { getOrgShifts } from 'src/util/dynamo-shift';

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
) => {
  try {
    setDefaultLoggerMetaForApi(event, logger);

    logger.info('incomingEvent', { values: { event } });
    logger.verbose('incomingEventAuth', {
      values: { authorizer: event.requestContext.authorizer },
    });

    // const claims = event.requestContext.authorizer?.jwt?.claims;
    // For some reason it can come through in two seperate ways
    // const requestingUserId =
    //   claims &&
    //   ((claims.username as string) || (claims['cognito:username'] as string));

    const orgId = event.pathParameters?.id || '';

    logger.verbose('Fetching Orgs shifts', { values: { orgId } });
    const orgShifts = await getOrgShifts(orgId);
    logger.info('Received shifts', { values: { orgShifts } });
    /**
     * TODO:
     * We obviously want to put safeguards here
     * to ensure that the users in the org can see the org data
     */

    if (!orgShifts) {
      logger.error('Shifts not found', {
        values: { orgId },
      });
      return generateReturn(404, { message: 'Shifts not found', orgId });
    }

    const returnValue = generateReturn(200, orgShifts);
    logger.info('Returning', { values: returnValue });

    return returnValue;
  } catch (error) {
    logger.error('Failed to get Org', {
      values: { error },
    });
    console.error('Failed to get org', error);
    return generateReturn(500, {
      message: 'Something went wrong trying to fetch the Org',
      error: error,
    });
  }
};
