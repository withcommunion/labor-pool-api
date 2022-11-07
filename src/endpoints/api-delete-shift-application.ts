import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { deleteApplication } from 'src/util/dynamo-shift-application';

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

    const shiftApplicationId = event.pathParameters?.id || '';
    if (!shiftApplicationId) {
      logger.error('No shiftApplicationId provided', {
        values: { shiftApplicationId },
      });
      return generateReturn(400, {
        message: 'No shiftApplicationId provided in path',
        shiftApplicationId,
      });
    }

    /**
     * TODO:
     * We obviously want to put safeguards here
     */

    logger.verbose('Deleting shift applications', {
      values: { shiftApplicationId },
    });
    const deleteResp = await deleteApplication(shiftApplicationId);
    logger.info('Deleted Shift', {
      values: { shiftApplicationId, deleteResp },
    });

    const returnValue = generateReturn(200, {
      message: 'Shift Application Deleted',
      isDeleted: deleteResp,
    });
    logger.info('Returning', { values: returnValue });

    return returnValue;
  } catch (error) {
    logger.error('Failed to delete shift application', {
      values: { error },
    });
    console.error('Failed to delete shift application', error);
    return generateReturn(500, {
      message: 'Something went wrong trying to delete the shift application',
      error: error,
    });
  }
};
