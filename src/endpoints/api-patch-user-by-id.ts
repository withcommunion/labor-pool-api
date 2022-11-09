import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { getUserById, IUser, updateUser } from 'src/util/dynamo-user';

interface ExpectedPatchBody {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  location: string;
  description: string;
  allowSms: boolean;
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

    const claims = event.requestContext.authorizer?.jwt?.claims;
    // For some reason it can come through in two seperate ways
    const requestingUserId =
      claims &&
      ((claims.username as string) || (claims['cognito:username'] as string));

    const userIdToUpdate = event.pathParameters?.id || requestingUserId;

    logger.verbose('Fetching user', { values: { userId: userIdToUpdate } });
    const user = await getUserById(userIdToUpdate);
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
          values: { userIdToUpdate },
        }
      );
      return generateReturn(404, { message: 'User not found' });
    }

    const parsedUser = parseBody(event.body || '');
    if (!parsedUser) {
      return generateReturn(500, {
        message: 'You didnt pass in anything to update',
        body: event.body,
        parsedBody: parsedUser,
      });
    }

    logger.verbose('Updating User', { values: { user: parsedUser } });
    const updatedUser = await updateUser(userIdToUpdate, parsedUser);
    logger.info("Updated User's Data", { values: { updatedUser } });

    const returnValue = generateReturn(200, {
      ...updatedUser,
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

function parseBody(bodyString: string): Partial<IUser> | null {
  try {
    logger.verbose('Parsing body', { values: { bodyString } });
    const body = JSON.parse(bodyString || '') as ExpectedPatchBody;
    logger.verbose('Parsed body', { values: { body } });

    const user = {
      firstName: body.firstName,
      lastName: body.lastName,
      phoneNumber: body.phoneNumber,
      location: body.location,
      description: body.description,
    };

    const updatedUser = {} as Partial<IUser>;

    Object.keys(user).forEach((key) => {
      // @ts-expect-error it's okay
      if (user[key]) {
        // @ts-expect-error it's okay
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        updatedUser[key] = user[key];
      }
    });

    logger.info('Parsed User', { values: { updatedUser } });

    return updatedUser;
  } catch (error) {
    logger.error('Failed to parse body', {
      values: { error, body: bodyString },
    });
    console.log('Failed to parse body', error);
    return null;
  }
}
