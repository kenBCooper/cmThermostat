export const awsConfig = {
  // Cognito Identity Pool ID for device shadow interaction
  poolId: 'us-west-2:3e78bed9-9fea-4ab8-aeee-4cd931afd6ae',
  // AWS Region
  region: 'us-west-2',
  // Unique deviceshadow endpoint
  endpoint: 'a22i2y89l436o4.iot.us-west-2.amazonaws.com',
};

// We have separate configs for the device shadow service
// and the auth service. Eventually we should get
// on the same cognito pool ID.
export const awsCognitoConfig = {
  // Cognito Identity Pool ID for authentication
  poolId: 'us-west-2_9hA0zhwrb',
  // Application ID for Cognito group.
  appClientId: '6s97aeq6n5kgk0ell2g6ebet1l',
  region: awsConfig.region,
  endpoint: awsConfig.endpoint,
  // Custom attribute name for mac address,
  macAttrName: 'custom:mac',
}