import type {
  PostConfirmationTriggerEvent,
  PreSignUpAdminCreateUserTriggerEvent,
  AuthResponseContext,
} from "aws-lambda";

import logger from "../util/winston-logger-util";

function setDefaultLoggerMeta(
  event: PostConfirmationTriggerEvent | PreSignUpAdminCreateUserTriggerEvent,
  context?: AuthResponseContext
) {
  const { request } = event;
  const { userAttributes } = request;
  const userId = userAttributes.sub || event.userName;
  const requestId = context?.awsRequestId
    ? (context.awsRequestId as string)
    : "";

  logger.defaultMeta = {
    _requestId: `${requestId?.substring(0, 8)}...${requestId?.substring(30)}}}`,
    requestId,
    userId,
  };
}

export const handler = async (
  event: PostConfirmationTriggerEvent | PreSignUpAdminCreateUserTriggerEvent,
  context?: AuthResponseContext
) => {
  try {
    const { request } = event;
    const { userAttributes } = request;
    const userId = userAttributes.sub || event.userName;

    setDefaultLoggerMeta(event, context);

    logger.info("Incoming request event:", { values: { event } });
    logger.verbose("Incoming request context:", { values: { context } });

    try {
      logger.verbose("Checking if user exists in DB", { values: { userId } });
      const existingUser = {};
      logger.info("Does user exist in DB", { values: { existingUser } });

      if (existingUser && process.env.NODE_ENV !== "local") {
        logger.warn("Cognito fired twice, there is nothing to do here");
        logger.info(
          "User exists in DB and has a wallet.  Nothing to do, lets return",
          { values: { event } }
        );
        return event;
      }
    } catch (error) {
      // Nothing to do here, move on
    }

    return event;
  } catch (error) {
    //
    /**
     * We likely want to just move on.
     * When this errors the user is already confirmed. And we cannot block them
     * If the seed fails
     * Our dynamo trigger will catch it and seed the user
     */
    logger.error(
      "Error in cognito-triggers/post-confirmation-create-user-wallet.ts",
      { values: { error } }
    );
    throw error;
  }
};
