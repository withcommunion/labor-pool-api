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
      type: Array,
      schema: [String],
      default: [],
    },
    friends: {
      type: Array,
      schema: [String],
      default: [],
    },
    schedules: {
      type: Array,
      schema: [String],
      default: [],
    },
  },
  {
    timestamps: {
      createdAt: ['createdAtSecs'],
      updatedAt: ['updatedAtSecs'],
    },
  }
);

const tableStage = process.env.STAGE === 'prod' ? 'prod' : 'dev';
export const Org = dynamoose.model<IOrg>(
  `labor-pool-orgsTable-${tableStage}`,
  schema
);

export async function getOrgById(id: string) {
  try {
    const org = await Org.get(id, {});
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

export async function addFriendToOrg(mainOrgId: string, friendlyOrgId: string) {
  try {
    const updatedOrg = await Org.update(
      { id: mainOrgId },
      // @ts-expect-error this is a dynamoose TS bug
      { $ADD: { friends: [friendlyOrgId] } }
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
