/**
 * Schema
 * Model
 * Use it
 */
import * as dynamoose from 'dynamoose';
import { Item } from 'dynamoose/dist/Item';

// Strongly typed model
interface IOrg extends Item {
  id: string;
  name: string;
  primaryMembers: string[];
  friends: string[];
  schedules: string[];
  createdAtSecs: number;
  updatedAtSecs: number;
}

const schema = new dynamoose.Schema(
  {
    id: String,
    name: String,
    primaryMembers: {
      type: Set,
      schema: [String],
    },
    friends: {
      type: Set,
      schema: [String],
    },
    schedules: {
      type: Set,
      schema: [String],
    },
  },
  {
    timestamps: {
      createdAt: ['createdAtSecs'],
      updatedAt: ['updatedAtSecs'],
    },
  }
);

export const Org = dynamoose.model<IOrg>('labor-pool-orgsTable-dev', schema);

export async function getOrgById(id: string) {
  try {
    const org = await Org.get(id);
    return org;
  } catch (error) {
    console.log('Failed to getOrgById', error);
    return null;
  }
}

export async function createOrg(org: {
  id: string;
  name: string;
  primaryMembers: string[];
}) {
  try {
    const savedOrg = await Org.create(org);
    return savedOrg;
  } catch (error) {
    console.log('Failed to createOrg', error);
    return null;
  }
}

export async function addMemberToOrg(orgId: string, userId: string) {
  try {
    const updatedOrg = await Org.update(
      { id: orgId },
      // @ts-expect-error this is a dynamoose TS bug
      { $ADD: { primaryMembers: [userId] } }
    );
    return updatedOrg;
  } catch (error) {
    console.log('Failed to addMemberToOrg', error);
    return null;
  }
}

export async function addScheduleToOrg(orgId: string, scheduleId: string) {
  try {
    const updatedOrg = await Org.update(
      { id: orgId },
      // @ts-expect-error this is a dynamoose TS bug
      { $ADD: { schedules: [scheduleId] } }
    );
    return updatedOrg;
  } catch (error) {
    console.log('Failed to addScheduleToOrg', error);
    return null;
  }
}

/**
    // @ts-expect-error its ok
    await user.update({ id: userId }, { $ADD: { shiftHistory: ['asdf3'] } });
    */
