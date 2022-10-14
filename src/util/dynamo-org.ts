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
    return Org.get(id);
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
    return Org.create(org);
  } catch (error) {
    console.log('Failed to createOrg', error);
    return null;
  }
}

/**
    // @ts-expect-error its ok
    await user.update({ id: userId }, { $ADD: { shiftHistory: ['asdf3'] } });
    */
