import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { getAllShifts } from 'src/util/dynamo-shift';

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

    logger.verbose('Fetching all shifts', { values: { orgId } });
    const allShifts = await getAllShifts();
    logger.info('Received shifts', { values: { allShifts } });
    /**
     * TODO:
     * We obviously want to put safeguards here
     * Pagination
     * Filtering mechanisms
     */

    if (!allShifts) {
      logger.error('Shifts not found', {
        values: { orgId },
      });
      return generateReturn(404, { message: 'Shifts not found', orgId });
    }

    const returnValue = generateReturn(200, allShifts);
    logger.info('Returning', { values: returnValue });

    return returnValue;
  } catch (error) {
    logger.error('Failed to get all shifts', {
      values: { error },
    });
    console.error('Failed to get all shifts', error);
    return generateReturn(500, {
      message: 'Something went wrong trying to fetch the shifts',
      error: error,
    });
  }
};
