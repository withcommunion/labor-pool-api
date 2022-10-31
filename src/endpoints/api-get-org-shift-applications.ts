import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { getShiftApplicationsByOrgId } from 'src/util/dynamo-shift-application';

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

    logger.verbose('Fetching Orgs shift applications', { values: { orgId } });
    const orgShiftApplications = await getShiftApplicationsByOrgId(orgId);
    logger.info('Received shifts', { values: { orgShiftApplications } });
    /**
     * TODO:
     * We obviously want to put safeguards here
     * to ensure that the users in the org can see the org data
     */

    if (!orgShiftApplications) {
      logger.error('No Applications found for org', {
        values: { orgId },
      });
      return generateReturn(404, { message: 'Shifts not found', orgId });
    }

    const returnValue = generateReturn(200, orgShiftApplications);
    logger.info('Returning', { values: returnValue });

    return returnValue;
  } catch (error) {
    logger.error('Failed to get shift applications for org', {
      values: { error },
    });
    console.error('Failed to get shift applications for org', error);
    return generateReturn(500, {
      message:
        'Something went wrong trying to fetch the shift applications for org',
      error: error,
    });
  }
};
