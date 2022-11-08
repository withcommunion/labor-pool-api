export interface returnObject {
  statusCode: number;
  body: string;
  headers: {
    'Access-Control-Allow-Origin': '*';
    'Access-Control-Allow-Credentials': boolean;
  };
}

export function generateReturn(
  statusCode: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: Record<string, unknown> | any
): returnObject {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
}

export function parseIdFromUrn(urn: string): string {
  return urn.split(':')[2];
}

export function parseEntityTypeFromUrn(urn: string): 'user' | 'org' {
  const entityType = urn.split(':')[1];
  if (entityType === 'user') {
    return 'user';
  } else if (entityType === 'org') {
    return 'org';
  } else {
    throw new Error('Invalid entity type passed to parseEntityTypeFromUrn');
  }
}
