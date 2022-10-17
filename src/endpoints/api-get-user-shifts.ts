import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { getUserShifts } from 'src/util/dynamo-shift';

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

    logger.verbose('Fetching Orgs shifts', { values: { userId } });
    const userShifts = await getUserShifts(userId);
    logger.info('Received shifts', { values: { userShifts } });
    /**
     * TODO:
     * We obviously want to put safeguards here
     * to ensure that not everyone can see the users data
     */

    if (!userShifts) {
      logger.error('Shifts not found', {
        values: { userId },
      });
      return generateReturn(404, { message: 'Shifts not found', userId });
    }

    const returnValue = generateReturn(200, userShifts);
    logger.info('Returning', { values: returnValue });

    return returnValue;
  } catch (error) {
    logger.error('Failed to get shifts for user', {
      values: { error },
    });
    console.error('Failed to get shifts for user', error);
    return generateReturn(500, {
      message: 'Something went wrong trying to fetch the shifts for user',
      error: error,
    });
  }
};
