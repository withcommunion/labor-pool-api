import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { getShiftApplicationsByUserId } from 'src/util/dynamo-shift-application';

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

    const userId = event.pathParameters?.id || '';

    logger.verbose('Fetching Users shift applications', { values: { userId } });
    const userShiftApplications = await getShiftApplicationsByUserId(userId);
    logger.info('Received shifts', { values: { userShiftApplications } });
    /**
     * TODO:
     * We obviously want to put safeguards here
     * to ensure that the users in the org can see the org data
     */

    if (!userShiftApplications) {
      logger.error('No Applications found for user', {
        values: { userId },
      });
      return generateReturn(404, { message: 'Shifts not found', userId });
    }

    const returnValue = generateReturn(200, userShiftApplications);
    logger.info('Returning', { values: returnValue });

    return returnValue;
  } catch (error) {
    logger.error('Failed to get shift applications for user', {
      values: { error },
    });
    console.error('Failed to get shift applications for user', error);
    return generateReturn(500, {
      message:
        'Something went wrong trying to fetch the shift applications for user',
      error: error,
    });
  }
};
