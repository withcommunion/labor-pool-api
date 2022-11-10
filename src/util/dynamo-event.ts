/**
 * Schema
 * Model
 * Use it
 */
import * as dynamoose from 'dynamoose';
import { Item } from 'dynamoose/dist/Item';
import { generateUrlFriendlyId } from './dynamo-util';

// Strongly typed model
export interface Event {
  id: string;
  eventUrn: string;
  event: string;
  description: string;
  record: object;
}

export interface IEvent extends Item, Event {
  createdAtMs: number;
  updatedAtMs: number;
}

const schema = new dynamoose.Schema(
  {
    id: {
      type: String,
      default: generateUrlFriendlyId(6),
    },
    eventUrn: String,
    event: String,
    description: String,
    record: Object,
  },
  {
    timestamps: {
      createdAt: ['createdAtMs'],
      updatedAt: ['updatedAtMs'],
    },
  }
);

const tableStage = process.env.STAGE === 'prod' ? 'prod' : 'dev';
export const Event = dynamoose.model<IEvent>(
  `labor-pool-eventsTable-${tableStage}`,
  schema
);

export async function createEvent(event: Partial<Event>) {
  try {
    const newEvent = new Event(event);
    console.log('Saving Event', { newEvent });
    const savedEvent = await newEvent.save();
    return savedEvent;
  } catch (error) {
    console.log('Failed to createEvent', error);
    return null;
  }
}

export async function getEventById(id: string) {
  try {
    const event = await Event.get(id, {});
    return event;
  } catch (error) {
    console.log('Failed to getEventById', error);
    return null;
  }
}

export async function getAllEvents() {
  try {
    const events = await Event.scan().exec();
    return events;
  } catch (error) {
    console.log('Failed to getAllEvents', error);
    return null;
  }
}
