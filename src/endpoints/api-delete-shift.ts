import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { deleteShiftById } from 'src/util/dynamo-shift';

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

    const shiftId = event.pathParameters?.id || '';
    if (!shiftId) {
      logger.error('No shiftId provided', {
        values: { shiftId },
      });
      return generateReturn(400, {
        message: 'No shiftId provided in path',
        shiftId,
      });
    }

    /**
     * TODO:
     * We obviously want to put safeguards here
     */

    logger.verbose('Deleting shift applications', {
      values: { shiftId },
    });
    const deleteResp = await deleteShiftById(shiftId);
    logger.info('Deleted Shift', {
      values: { shiftId, deleteResp },
    });

    const returnValue = generateReturn(200, {
      message: 'Shift Deleted',
      isDeleted: deleteResp,
    });
    logger.info('Returning', { values: returnValue });

    return returnValue;
  } catch (error) {
    logger.error('Failed to delete shift', {
      values: { error },
    });
    console.error('Failed to delete shift', error);
    return generateReturn(500, {
      message: 'Something went wrong trying to delete the shift',
      error: error,
    });
  }
};
