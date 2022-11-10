import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { getAllEvents } from 'src/util/dynamo-event';

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

    logger.verbose('Fetching all events', { values: { orgId } });
    const allEvents = await getAllEvents();
    logger.info('Received events', { values: { allEvents } });
    /**
     * TODO:
     * We obviously want to put safeguards here
     * Pagination
     * Filtering mechanisms
     */

    if (!allEvents) {
      logger.error('events not found', {
        values: { orgId },
      });
      return generateReturn(404, { message: 'Events not found', orgId });
    }

    const returnValue = generateReturn(200, allEvents);
    logger.info('Returning', { values: returnValue });

    return returnValue;
  } catch (error) {
    logger.error('Failed to get all events', {
      values: { error },
    });
    console.error('Failed to get all events', error);
    return generateReturn(500, {
      message: 'Something went wrong trying to fetch the events',
      error: error,
    });
  }
};
