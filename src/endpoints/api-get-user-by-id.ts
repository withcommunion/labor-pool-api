import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { getUserById } from 'src/util/dynamo-user';

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
) => {
  try {
    setDefaultLoggerMetaForApi(event, logger);

    logger.info('incomingEvent', { values: { event } });
    logger.verbose('incomingEventAuth', {
      values: { authorizer: event.requestContext.authorizer },
    });

    const claims = event.requestContext.authorizer?.jwt?.claims;
    // For some reason it can come through in two seperate ways
    const requestingUserId =
      claims &&
      ((claims.username as string) || (claims['cognito:username'] as string));

    const userIdToFetch = event.pathParameters?.id || requestingUserId;

    logger.verbose('Fetching user', { values: { userId: userIdToFetch } });
    const user = await getUserById(userIdToFetch);
    logger.info('Received User', { values: { user } });
    /**
     * TODO:
     * We obviously want to put safeguards here
     * to ensure that the user can only see their own data
     */

    if (!user) {
      logger.error(
        'User not found,  something is wrong, user is Authd and exists in Cognito but not in our DB',
        {
          values: { userIdToFetch },
        }
      );
      return generateReturn(404, { message: 'User not found' });
    }

    const returnValue = generateReturn(200, {
      ...user,
    });
    logger.info('Returning', { values: returnValue });

    return returnValue;
  } catch (error) {
    logger.error('Failed to get User', {
      values: { error },
    });
    console.error('Failed to get User', error);
    return generateReturn(500, {
      message: 'Something went wrong trying to fetch User',
      error: error,
    });
  }
};
