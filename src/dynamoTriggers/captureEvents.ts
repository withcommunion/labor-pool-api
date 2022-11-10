import type { DynamoDBStreamEvent } from 'aws-lambda';
import * as dynamoose from 'dynamoose';

import logger from '../util/winston-logger-util';

import { createEvent } from 'src/util/dynamo-event';

const converter = dynamoose.aws.converter();

export const handler = async (
  event: DynamoDBStreamEvent,
  context: { awsRequestId: string }
) => {
  try {
    setDefaultLoggerMeta(context);

    logger.info('Incoming request event:', { values: { event } });
    logger.verbose('Incoming request context:', { values: { context } });

    logger.info('Processing records...', {
      values: { records: event.Records },
    });

    logger.verbose('Insering events into dynamo...', {
      values: { records: event.Records },
    });
    const insertResps = await Promise.all(
      event.Records.map(async (record) => {
        const eventName = record.eventName;

        const recordToStore = converter.unmarshall(
          // @ts-expect-error its ok
          record.dynamodb?.NewImage || record.dynamodb?.OldImage || {}
        );

        let recordType = '';
        if (record.eventSourceARN?.includes('shiftApplicationsTable')) {
          recordType = 'shiftApplication';
        } else if (record.eventSourceARN?.includes('shiftsTable')) {
          recordType = 'shift';
        } else if (record.eventSourceARN?.includes('usersTable')) {
          recordType = 'user';
        } else if (record.eventSourceARN?.includes('orgsTable')) {
          recordType = 'org';
        }

        const urn = `urn:${recordType}:${(recordToStore?.id as string) || ''}`;

        const event = {
          eventUrn: urn,
          event: eventName,
          description: `Record ${eventName || ''} for ${recordType}`,
          record: recordToStore,
          ownerUrn: recordToStore?.ownerUrn as string,
        };

        return createEvent(event);
      })
    );

    logger.info('Successfully processed records', { values: { insertResps } });

    return event;
  } catch (error) {
    console.error(error);
    logger.error('Error in dynamo-triggers/captureEvents.ts', {
      values: { error },
    });

    return event;
  }
};

function setDefaultLoggerMeta(context: { awsRequestId: string }) {
  const { awsRequestId } = context;

  logger.defaultMeta = {
    _requestId: `${awsRequestId?.substring(0, 8)}...${awsRequestId?.substring(
      30
    )}}}`,
  };
}
