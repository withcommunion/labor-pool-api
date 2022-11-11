import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { getTime } from 'date-fns';

import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { IShift, updateShift } from 'src/util/dynamo-shift';
import { getOrgById } from 'src/util/dynamo-org';

interface ExpectedPatchBody {
  name?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  location?: string;
  orgId?: string;
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
    // For some reason it can come through in two seperate ways
       */
    /**
    const claims = event.requestContext.authorizer?.jwt?.claims;
    const requestUserId =
      claims &&
      ((claims.username as string) || (claims['cognito:username'] as string));
    */

    const shiftId = event.pathParameters?.id;

    if (!shiftId) {
      return generateReturn(400, { message: 'Missing shift id in path' });
    }

    const parsedShift = parseBody(event.body || '');
    if (!parsedShift) {
      return generateReturn(500, {
        message: 'You didnt pass in anything to update',
        body: event.body,
        parsedBody: parsedShift,
      });
    }

    if (parsedShift.orgId) {
      logger.verbose('Fetching org', { values: { orgId: parsedShift.orgId } });
      const org = await getOrgById(parsedShift.orgId);
      if (!org) {
        return generateReturn(404, {
          message: 'Org not found',
          orgId: parsedShift.orgId,
        });
      }
    }

    const shift = { ...parsedShift } as Partial<IShift>;

    logger.verbose('Updating shift', { values: { shift } });
    const savedShift = await updateShift(shiftId, shift);
    if (!savedShift) {
      logger.info('Failed to update shift', { values: { savedShift } });
      return generateReturn(500, {
        message: 'Failed to update shif',
        shift,
      });
    }
    logger.info('Created shift', { values: { savedShift } });

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

function parseBody(bodyString: string): Partial<IShift> | null {
  try {
    const body = JSON.parse(bodyString || '') as ExpectedPatchBody;

    const shift = {
      orgId: body.orgId,
      name: body.name,
      status: body.status || 'open',
      description: body.description,
      location: body.location,
      assignedTo: body.assignedTo,
      startTimeMs: body.startDate
        ? getTime(new Date(body.startDate.trim()))
        : null,
      endTimeMs: body.endDate ? getTime(new Date(body.endDate.trim())) : null,
      startDateIso: body.startDate,
      endDateIso: body.endDate,
    };

    const updatedShift = {} as Partial<IShift>;

    Object.keys(shift).forEach((key) => {
      // @ts-expect-error it's okay
      if (shift[key]) {
        // @ts-expect-error it's okay
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        updatedShift[key] = shift[key];
      }
    });

    return updatedShift;
  } catch (error) {
    logger.error('Failed to parse body', {
      values: { error, body: bodyString },
    });
    console.log('Failed to parse body', error);
    return null;
  }
}
