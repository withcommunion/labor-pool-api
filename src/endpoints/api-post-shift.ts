import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { createShift, IShift } from 'src/util/dynamo-shift';
import { getOrgById } from 'src/util/dynamo-org';
import { addShiftToUser, getUserById } from 'src/util/dynamo-user';

interface ExpectedPostBody {
  name: string;
  orgId: string;
  beginDate: string;
  endDate: string;
  description?: string;
  status?: string;
  assignedTo?: string;
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

    /**
     * TODO: Ensure that requesting user is manager in org
    const claims = event.requestContext.authorizer?.jwt?.claims;
    // For some reason it can come through in two seperate ways
    const requestingUserId =
      claims &&
      ((claims.username as string) || (claims['cognito:username'] as string));
       */

    const shift = parseBody(event.body || '');
    if (
      !shift ||
      !shift.name ||
      !shift.orgId ||
      !shift.beginDate ||
      !shift.endDate
    ) {
      return generateReturn(500, {
        message: 'You are missing some required fields',
        body: event.body,
        parsedBody: shift,
        requiredFields: ['name', 'orgId', 'beginDate', 'endDate'],
      });
    }

    logger.verbose('Fetching org', { values: { orgId: shift.orgId } });
    const org = await getOrgById(shift.orgId);
    if (!org) {
      return generateReturn(404, {
        message: 'Org not found',
        orgId: shift.orgId,
      });
    }

    if (shift.assignedTo) {
      const userToAssignTo = await getUserById(shift.assignedTo);
      if (!userToAssignTo) {
        return generateReturn(404, {
          message: 'User assigned to not found',
          orgId: shift.orgId,
        });
      }
    }

    logger.verbose('Creating shift', { values: { shift } });
    const savedShift = await createShift(shift);
    if (!savedShift) {
      logger.info('Failed to save shift', { values: { savedShift } });
      return generateReturn(500, {
        message: 'Failed to save shif',
        shift,
      });
    }
    logger.info('Created shift', { values: { savedShift } });

    if (shift.assignedTo) {
      logger.verbose('Adding shift to user');
      await addShiftToUser(shift.assignedTo, savedShift.id);
      logger.info('Added shift to user');
    }

    const returnValue = generateReturn(200, {
      ...savedShift,
    });
    logger.info('Returning', { values: returnValue });

    return returnValue;
  } catch (error) {
    logger.error('Failed to create shift', {
      values: { error },
    });
    console.error('Failed to create shift', error);
    return generateReturn(500, {
      message:
        'Something went wrong trying to save the shift, please try again.',
      error: error,
    });
  }
};

function parseBody(bodyString: string) {
  try {
    const body = JSON.parse(bodyString || '') as ExpectedPostBody;

    const shift = {
      orgId: body.orgId,
      name: body.name,
      status: body.status || 'open',
      description: body.description,
      assignedTo: body.assignedTo,
      beginDate: body.beginDate,
      endDate: body.endDate,
    } as IShift;

    return shift;
  } catch (error) {
    logger.error('Failed to parse body', {
      values: { error, body: bodyString },
    });
    console.log('Failed to parse body', error);
    return null;
  }
}
