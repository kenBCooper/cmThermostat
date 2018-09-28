export const awsDeviceShadowConfig = {
  // Cognito Identity Pool ID for device shadow interaction
  poolId: 'us-west-2:3e78bed9-9fea-4ab8-aeee-4cd931afd6ae',
  // AWS Region
  region: 'us-west-2',
  // Unique deviceshadow endpoint
  endpoint: 'a22i2y89l436o4.iot.us-west-2.amazonaws.com',
};

export const awsUserPoolConfig = {
  // Cognito Identity Pool ID for authentication
  poolId: 'us-west-2_A6cjDGAKR',
  // Application ID for Cognito group.
  appClientId: '3m8sdc5d1casvihs81t4ha9cd5',
  region: awsDeviceShadowConfig.region,
  endpoint: awsDeviceShadowConfig.endpoint,
  // Custom attribute name for mac address,
  macAttrName: 'custom:mac',
}
