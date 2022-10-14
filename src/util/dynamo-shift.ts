/**
 * Schema
 * Model
 * Use it
 */
import * as dynamoose from 'dynamoose';
import { Item } from 'dynamoose/dist/Item';
import { nanoid } from 'nanoid';

// Strongly typed model
export interface IShift extends Item {
  id: string;
  name: string;
  orgId: string;
  status: string;
  description: string;
  assignedTo: string;
  beginDate: string;
  endDate: string;
  createdAtSecs: number;
  updatedAtSecs: number;
}

const schema = new dynamoose.Schema(
  {
    id: String,
    name: String,
    orgId: String,
    status: String,
    description: String,
    assignedTo: String,
    beginDate: String,
    endDate: String,
  },
  {
    timestamps: {
      createdAt: ['createdAtSecs'],
      updatedAt: ['updatedAtSecs'],
    },
    saveUnknown: true,
  }
);

const tableStage = process.env.STAGE === 'prod' ? 'prod' : 'dev';
export const Shift = dynamoose.model<IShift>(
  `labor-pool-shiftsTable-${tableStage}`,
  schema
);

export async function getShiftById(id: string) {
  try {
    const shift = await Shift.get(id);
    return shift;
  } catch (error) {
    console.log('Failed to getShiftById', error);
    return null;
  }
}

export async function createShift(shift: {
  name: string;
  orgId: string;
  description: string;
  beginDate: string;
  endDate: string;
  status: string;
  assignedTo: string;
}) {
  try {
    const newShift = await Shift.create({ id: nanoid(), ...shift });
    return newShift;
  } catch (error) {
    console.log('Failed to createShift', error);
    return null;
  }
}

export async function addUserToShift(shiftId: string, userId: string) {
  try {
    const updatedShift = await Shift.update({
      id: shiftId,
      assignedTo: userId,
    });
    return updatedShift;
  } catch (error) {
    console.log('Failed to addUserToShift', error);
    return null;
  }
}
