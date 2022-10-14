import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { getUserById, addShiftToUser } from 'src/util/dynamo-user';
import { applyUserToShift, getShiftById } from 'src/util/dynamo-shift';

interface ExpectedPatchBody {
  memberId: string;
  status: string;
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

    const shiftId = event.pathParameters?.id;

    const { memberId, status } = parseBody(event.body || '');
    if (!memberId || !status) {
      return generateReturn(500, {
        message: 'Failed to parse memberId from body',
        body: event.body,
        requiredFields: ['memberId', 'status'],
      });
    }

    if (!shiftId) {
      return generateReturn(500, {
        message: 'Missing shiftId from path',
        body: shiftId,
        requiredFields: ['shiftId'],
      });
    }
    /**
     * TODO: Will want to ensure only members in org or friendly orgs can apply to shifts
     */

    const shift = await getShiftById(shiftId);
    const member = await getUserById(memberId);

    if (!shift || !member) {
      return generateReturn(404, {
        message: 'The shift or member was not found',
        shift,
        member,
      });
    }

    logger.verbose('Assigning member to shift', {
      values: { shift, member },
    });

    if (shift.assignedTo) {
      logger.info('Shift already assigned', { values: { shift } });

      const shiftAssignedToUser = await getUserById(shift.assignedTo);
      return generateReturn(400, {
        message: `Shift is already assigned to a user: ${
          shiftAssignedToUser?.firstName || ''
        } ${shiftAssignedToUser?.lastName || ''}`,
        user: shiftAssignedToUser,
      });
    }

    logger.verbose('Adding user to shift', {
      values: { shiftId, memberId, status },
    });
    const updatedShift = await applyUserToShift(shiftId, memberId, status);
    logger.info('Added user to shift', {
      values: { updatedShift },
    });

    logger.verbose('Adding shift to user', {
      values: { shiftId, memberId, status },
    });
    const updatedUser = await addShiftToUser(memberId, shiftId);
    logger.info('Added shift to user', {
      values: { updatedUser },
    });

    const returnValue = generateReturn(200, {
      success: true,
    });
    logger.info('Returning', { values: returnValue });

    return returnValue;
  } catch (error) {
    logger.error('Failed to apply to shift', {
      values: { error },
    });
    console.error('Failed to apply to shift', error);
    return generateReturn(500, {
      message:
        'Something went wrong trying to apply to the shift, please try again.',
      error: error,
    });
  }
};

function parseBody(bodyString: string) {
  try {
    const body = JSON.parse(bodyString || '') as ExpectedPatchBody;
    const { memberId, status } = body;

    return { memberId, status };
  } catch (error) {
    logger.error('Failed to parse body', {
      values: { error, body: bodyString },
    });
    console.log('Failed to parse body', error);
    return {};
  }
}
