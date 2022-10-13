import type {
  PostConfirmationTriggerEvent,
  PreSignUpAdminCreateUserTriggerEvent,
  AuthResponseContext,
} from 'aws-lambda';

import logger from '../util/winston-logger-util';

import { User } from '../util/dynamo-user';

export const handler = async (
  event: PostConfirmationTriggerEvent | PreSignUpAdminCreateUserTriggerEvent,
  context?: AuthResponseContext
) => {
  try {
    const { request } = event;
    const { userAttributes } = request;
    const userId = userAttributes.sub || event.userName;

    setDefaultLoggerMeta(event, context);

    logger.info('Incoming request event:', { values: { event } });
    logger.verbose('Incoming request context:', { values: { context } });

    try {
      logger.verbose('Checking if user exists in DB', { values: { userId } });
      const existingUser = await User.get(userId);
      logger.info('Does user exist in DB?', { values: { existingUser } });

      if (existingUser) {
        logger.warn('Cognito fired twice, there is nothing to do here');
        logger.info('User exists in DB.  Nothing to do, lets return', {
          values: { event },
        });
        return event;
      }
    } catch (error) {
      // Nothing to do here, move on
    }

    await User.create({
      id: userId,
      firstName: userAttributes['given_name'],
      lastName: userAttributes['family_name'],
      email: userAttributes.email,
      phoneNumber: userAttributes['phone_number'] || '',
      allowSms: Boolean(userAttributes['phone_number']),
      primaryOrgId: '',
    });

    return event;
  } catch (error) {
    logger.error('Error in cognito-triggers/post-confir-create-user.ts', {
      values: { error },
    });
    throw error;
  }
};

function setDefaultLoggerMeta(
  event: PostConfirmationTriggerEvent | PreSignUpAdminCreateUserTriggerEvent,
  context?: AuthResponseContext
) {
  const { request } = event;
  const { userAttributes } = request;
  const userId = userAttributes.sub || event.userName;
  const requestId = context?.awsRequestId
    ? (context.awsRequestId as string)
    : '';

  logger.defaultMeta = {
    _requestId: `${requestId?.substring(0, 8)}...${requestId?.substring(30)}}}`,
    requestId,
    userId,
  };
}
