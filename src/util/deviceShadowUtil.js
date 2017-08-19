import aws from 'aws-sdk';
import AWSMqtt from 'aws-mqtt-client';
import awsConfiguration from '../aws-configuration';

let thingName = undefined;

const BASE_REQUEST_VALUE = '0,0,';
const BASE_REQUEST_MESSAGE = `{"state": {"reported":{"R":"${BASE_REQUEST_VALUE}"}}}`;

// 3 sec debounce.
const PUBLISH_DEBOUNCE_TIME = 3000;

let mqttClient;
let publishTimeout;

// Describes how to parse the device shadow value list:
//{[value index]: 'value meaning'}
const STAT_PARSE_LIST = {
  1: 'lockStatus',
  2: 'currentTemp',
  3: 'occupiedCool',
  4: 'occupiedHeat',
  5: 'unoccupiedCool',
  6: 'unoccupiedHeat',
  53: 'zoneStatus',
  54: 'zoneCall',
};

const DIAGNOSTIC_PARSE_LIST = {
  1: 'leavingAir',
  2: 'returnAir',
  3: 'outsideAir',
  4: 'errorCodeZone1',
  5: 'errorCodeZone2',
  6: 'errorCodeZone3',
  7: 'errorCodeZone4',
  8: 'errorCodeZone5',
  9: 'errorCodeZone6',
  10: 'errorCodeZone7',
  11: 'errorCodeZone8',
  12: 'errorCodeZone9',
  13: 'errorCodeZone10',
  14: 'errorCodeZone11',
  15: 'errorCodeZone12',
  16: 'errorCodeZone13',
  17: 'errorCodeZone14',
  18: 'errorCodeZone15',
  19: 'errorCodeZone16',
  20: 'errorCodeZone17',
  21: 'errorCodeZone18',
  22: 'errorCodeZone19',
  23: 'errorCodeZone20',
  24: 'systemStatus',
}

const setThingName = (macAddress) => {
  thingName = `5410ec49${macAddress}`;
}

const updateAcceptedTopicName = () => {
  return `$aws/things/${thingName}/shadow/update/accepted`;
}

const updateRejectedTopicName = () => {
  return `$aws/things/${thingName}/shadow/update/rejected`;
}

const updateTopicName = () => {
  return `$aws/things/${thingName}/shadow/update`;
}

const getTopicName = () => {
  return `$aws/things/${thingName}/shadow/get`;
}

export const publishDeviceShadowUpdate = (updatedShadow, zoneId) => {
  clearTimeout(publishTimeout);
  const shadowUpdatePayload = getZoneUpdatePayload(updatedShadow, zoneId);
  publishTimeout = setTimeout(() => {
    const updatePayload = {
      state: {
          reported: shadowUpdatePayload
      }
    };

    mqttClient.publish(updateTopicName(), JSON.stringify(updatePayload));
  }, PUBLISH_DEBOUNCE_TIME);
}

// Update raw shadow with new values in the updateShadowObject.
// Return the new raw shadow for storage.
export const updateRawDeviceShadow = (rawShadow, updateShadowObject) => {
  Object.keys(rawShadow).forEach((key) => {
    if (key.charAt(0) === 'S') {
      const zoneNumber = parseInt(key.split('S')[1], 10);
      const zoneValues = updateShadowObject.zones[zoneNumber];

      let rawValues = rawShadow[key];
      if (rawValues.charAt(rawValues.length - 1) === ',') {
        rawValues = rawValues.slice(0, -1);
      }
      const rawValuesArr = rawValues.split(',');

      Object.keys(STAT_PARSE_LIST).forEach((key) => {
        const valPosition = key;
        const valName = STAT_PARSE_LIST[key];

        rawValuesArr[valPosition] = zoneValues[valName];
      });

      rawShadow[key] = rawValuesArr.join(',') + ',';
    }
  });

  return rawShadow;
}

export const parseDeviceShadow = (rawDeviceShadow) => {
  let parsedDeviceShadow = {
    zones: {},
    diagnostics: {},
  };

  Object.keys(rawDeviceShadow).forEach((key) => {
    let values = rawDeviceShadow[key];
    if (values.charAt(values.length - 1) === ',') {
      values = values.slice(0, -1);
    }
    const valuesArr = values.split(',');

    if (key.charAt(0) === 'S') {
      const zoneNumber = parseInt(key.split('S')[1], 10);
      const zoneData = parseZoneData(valuesArr);
      parsedDeviceShadow.zones[zoneNumber] = zoneData;
    } else if (key === 'D') {
      const diagnosticData = parseDiagnosticData(valuesArr);
      parsedDeviceShadow.diagnostics = diagnosticData;
    } else if (key === 'DIS') {
      const discoverData = parseDiscoverData(valuesArr);
      parsedDeviceShadow.discover = discoverData;
    }
  });

  return parsedDeviceShadow;
}

export const connectToDeviceShadow = (macAddress, onUpdate, onSuccess) => {
  if (!macAddress) throw new Error('no mac address provided for device connection');
  setThingName(macAddress);

  let initialConnection = false;

  configureCognitoId((credentials) => {
    mqttClient = new AWSMqtt({
      accessKeyId: credentials.AccessKeyId,
      secretAccessKey: credentials.SecretKey,
      sessionToken: credentials.SessionToken,
      endpointAddress: awsConfiguration.endpoint,
      region: awsConfiguration.region,
    });

    mqttClient.on('connect', () => {
      console.log('connected to iot mqtt websocket');
      // Set up intial subscriptions if this is the first connection.
      if (!initialConnection) {
        mqttClient.subscribe(updateAcceptedTopicName());
        mqttClient.subscribe(updateRejectedTopicName());                
        initialConnection = true;
      }

      mqttClient.publish(updateTopicName(), BASE_REQUEST_MESSAGE);
      mqttClient.publish(getTopicName());

      // DUMMY FOR WHEN BOARD IS DOWN
      onUpdate(JSON.parse(`{
          "R": "0,0,",
          "C": "0,144,45,0,4,2,0,3,0,20,0,2,0,0,6,11,8,4,43,1,17,",
          "D": "0,78,32,32,3,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,",
          "V": "0,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,2,",
          "DIS": "1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,",
          "P": "0,1,2,3,4,",
          "S1": "0,0,75,90,88,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,7,0,0,3,3,1,0,0,0,",
          "S2": "0,0,75,83,81,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,3,3,1,0,0,0,"
      }`));
    });

    mqttClient.on('message', (topic, message) => {
      if (topic === updateRejectedTopicName()) {
        console.log('update rejected!');
        console.log(`${message.toString()}`);
      } else if (topic === updateAcceptedTopicName()) {
        const messageJson = JSON.parse(message);
        if (messageJson.state && messageJson.state.reported) {
          const updatedShadowState = messageJson.state.reported

          // Do not update local state if the server is returning an empty update.
          // This happens as the device shadow periodically clears its state.
          if (Object.keys(updatedShadowState).every((key) => {
            return updatedShadowState[key] === null;
          })) return;
          // Do not update local state if the server is achknowledging a base request.
          // Subsequent requests will contain the device shadow data needed.
          if (updatedShadowState.R === BASE_REQUEST_VALUE) return;

          onUpdate(updatedShadowState);
        }
      }
    });

    onSuccess(mqttClient);
  });
}

const configureCognitoId = (onSuccess) => {
  // Initialize our configuration.
  aws.config.region = awsConfiguration.region;

  aws.config.credentials = new aws.CognitoIdentityCredentials({
    IdentityPoolId: awsConfiguration.poolId
  });

  // Attempt to authenticate to the Cognito Identity Pool.  Note that this
  // example only supports use of a pool which allows unauthenticated 
  // identities.
  var cognitoIdentity = new aws.CognitoIdentity();
  aws.config.credentials.get((err, data) => {
    if (!err) {
      console.log('retrieved identity: ' + aws.config.credentials.identityId);
      var params = {
        IdentityId: aws.config.credentials.identityId
      };
      cognitoIdentity.getCredentialsForIdentity(params, function(err, data) {
        if (!err) {
          console.log('retrieved credentials');
          // Trigger success callback, passing in our latest aws credentials
          onSuccess(data.Credentials);
        } else {
          console.log('error retrieving credentials: ' + err);
          alert('error retrieving credentials: ' + err);
        }
      });
   } else {
    console.log('error retrieving identity:' + err);
    alert('error retrieving identity: ' + err);
   }
  });
}

const parseZoneData = (zoneValues) => {
  let parsedZoneData = {};
  zoneValues.forEach((value, index) => {
    if (STAT_PARSE_LIST[index]) {
      parsedZoneData[STAT_PARSE_LIST[index]] = zoneValues[index];
    }
  });

  return parsedZoneData;
}

const parseDiagnosticData = (diagnosticValues) => {
  let parsedDiagnosticData = {};
  diagnosticValues.forEach((value, index) => {
    if (DIAGNOSTIC_PARSE_LIST[index]) {
      parsedDiagnosticData[DIAGNOSTIC_PARSE_LIST[index]] = diagnosticValues[index];
    }
  });

  return parsedDiagnosticData;
}

const parseDiscoverData = (discoverValues) => {
  return {
    rmCount: discoverValues[0],
  };
}

// Get specific zone update payload, needed so we only send exactly what
// has updated. Payload size must be kept to a minimum.
const getZoneUpdatePayload = (rawShadow, zoneId) => {
  let zoneUpdatePayload = {};
  Object.keys(rawShadow).forEach((key) => {
    if (key.charAt(0) === 'S') {
      const zoneNumber = key.split('S')[1];
      if (zoneNumber === zoneId) {
        zoneUpdatePayload[key] = rawShadow[key];
      }
    }
  });

  return zoneUpdatePayload;
}

