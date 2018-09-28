import aws from 'aws-sdk';
import AWSMqtt from 'aws-mqtt-client';
import moment from 'moment';

import { getStore } from './reduxUtil';
import { selectCurrentGenX, selectIsSubscribedToDevice } from '../selectors/AppSelectors';
import { awsDeviceShadowConfig } from '../aws-configuration';
import { STAT_PARSE_LIST, DIAGNOSTIC_PARSE_LIST } from './deviceShadowParseConfig';
import { DAY_NAMES, AM_PM_VALUES } from '../constants/ScheduleConstants';

// 3 sec debounce per unique zone update.
const UPDATE_DEBOUNCE_TIME = 3500;

// Data structure for PENDING_UPDATES
// PENDING UPDATES = {
//   systemId: {
//     <V (vacation) or Z (zones)>: {
//       timeout: window.timeout,
//       payload: <updated device shadow object>
//     }
//   }
// }
const PENDING_UPDATES = {};
const VACATION_UPDATE = 'V';
const ZONE_UPDATE = 'Z';

let mqttClient;
let congnitoCredentials;

const updateAcceptedTopicName = (macAddress) => {
  return `$aws/things/${macAddress}/shadow/update/accepted`;
}

const updateRejectedTopicName = (macAddress) => {
  return `$aws/things/${macAddress}/shadow/update/rejected`;
}

const updateTopicName = () => {
  const store = getStore();
  const state = store.getState();
  const currentGenXMacAddress = selectCurrentGenX(state);
  return `$aws/things/${currentGenXMacAddress}/shadow/update`;
}

const getCurrentMacAddress = () => {
  const store = getStore();
  const state = store.getState();
  const currentGenXMacAddress = selectCurrentGenX(state);
  return currentGenXMacAddress;
};

const createBaseRequestMessage = (systemNumber) => {
  return JSON.stringify({
    state: {
      reported: {
        R: `${systemNumber},0,`
      }
    }
  });
}

export const publishDeviceShadowZoneUpdate = (updatedShadow, systemId, zoneId) => {
  // If an update is pending for this specific system, replace it with the latest
  // update.
  const pendingUpdate = PENDING_UPDATES[systemId] && PENDING_UPDATES[systemId][ZONE_UPDATE];
  if (pendingUpdate && pendingUpdate.timeout) clearTimeout(pendingUpdate.timeout);

  let nextUpdatePayload = getZoneUpdatePayload(updatedShadow, zoneId);
  if (pendingUpdate && pendingUpdate.payload) {
    nextUpdatePayload = mergeUpdatePayloads(nextUpdatePayload, pendingUpdate.payload);
  }

  const nextUpdate = setTimeout(() => {
    const updatePayload = {
      state: {
          reported: nextUpdatePayload
      }
    };

    // For debugging:
		// console.log("Published: ", updatePayload);
    mqttClient.publish(updateTopicName(), JSON.stringify(updatePayload));
    PENDING_UPDATES[systemId][ZONE_UPDATE] = {};
  }, UPDATE_DEBOUNCE_TIME);

  if (!PENDING_UPDATES[systemId]) PENDING_UPDATES[systemId] = { Z: {} };
  PENDING_UPDATES[systemId][ZONE_UPDATE].timeout = nextUpdate;
  PENDING_UPDATES[systemId][ZONE_UPDATE].payload = nextUpdatePayload;
}

export const publishDeviceShadowVacationUpdate = (updatedShadow, systemId) => {
  // If an update is pending for this specific system, replace it with the latest
  // update.
  const pendingUpdate = PENDING_UPDATES[systemId] && PENDING_UPDATES[systemId][VACATION_UPDATE];
  if (pendingUpdate && pendingUpdate.timeout) clearTimeout(pendingUpdate.timeout);

  const nextUpdatePayload = getVacUpdatePayload(updatedShadow);

  const nextUpdate = setTimeout(() => {
    const updatePayload = {
      state: {
          reported: nextUpdatePayload
      }
    };

    // For debugging:
		// console.log("Published: ", updatePayload);
    mqttClient.publish(updateTopicName(), JSON.stringify(updatePayload));
    PENDING_UPDATES[systemId][VACATION_UPDATE] = {};
  }, UPDATE_DEBOUNCE_TIME);

	if (!PENDING_UPDATES[systemId]) PENDING_UPDATES[systemId] = { V: {} };
	PENDING_UPDATES[systemId][VACATION_UPDATE].timeout = nextUpdate;
  PENDING_UPDATES[systemId][VACATION_UPDATE].payload = nextUpdatePayload;
}

const mergeUpdatePayloads = (newPayload, pendingPayload) => {
  return Object.assign({}, pendingPayload, newPayload);
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
		} else if (key === 'V') {
			const SYS_OFFSET = 1;
			const LENGTH_OFFSET = 0;
			const MONTH_OFFSET = 1;
			const DAY_OFFSET = 2;

			const updateVacations = updateShadowObject.vacations;

      let rawValues = rawShadow[key];
      if (rawValues.charAt(rawValues.length - 1) === ',') {
        rawValues = rawValues.slice(0, -1);
      }
      const rawValuesArr = rawValues.split(',');

			for (let i=0; i < 20; i++) {
				if (updateVacations[i]) {
					rawValuesArr[SYS_OFFSET+3*i+LENGTH_OFFSET] = updateVacations[i].endDate.diff(updateVacations[i].startDate, 'days');
					rawValuesArr[SYS_OFFSET+3*i+MONTH_OFFSET] = updateVacations[i].startDate.format("M");
					rawValuesArr[SYS_OFFSET+3*i+DAY_OFFSET] = updateVacations[i].startDate.format("D");
				} else {
					rawValuesArr[SYS_OFFSET+3*i+LENGTH_OFFSET] = 0;
					rawValuesArr[SYS_OFFSET+3*i+MONTH_OFFSET] = 1;
					rawValuesArr[SYS_OFFSET+3*i+DAY_OFFSET] = 1;
				}
			}

      rawShadow[key] = rawValuesArr.join(',') + ',';
		}
  });

  return rawShadow;
}

export const parseDeviceShadow = (rawDeviceShadow) => {
  let parsedDeviceShadow = {
    zones: {},
    diagnostics: {},
		vacations: {},
  };

  let systemNumber;
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
      systemNumber = valuesArr[0];
    } else if (key === 'D') {
      const diagnosticData = parseDiagnosticData(valuesArr);
      parsedDeviceShadow.diagnostics = diagnosticData;
      systemNumber = valuesArr[0];
    } else if (key === 'DIS') {
      const discoverData = parseDiscoverData(valuesArr);
      parsedDeviceShadow.discover = discoverData;
      systemNumber = valuesArr[0];
    } else if (key === 'V') {
      const vacationData = parseVacationData(valuesArr);
      parsedDeviceShadow.vacations = vacationData;
      systemNumber = valuesArr[0];
    } else if (key === 'C') {
      const systemConfigData = parseSystemConfigurationData(valuesArr);
      parsedDeviceShadow.systemConfig = systemConfigData;
      systemNumber = valuesArr[0];
    } else {
      // It is important to always have the relevant system number, even if we have
      // an update containing an unexpected key.
      systemNumber = valuesArr[0];
    }
  });

  // The system number that the shadow pertains to will be included as the first value
  // in S/D/other data sent over the wire.
  parsedDeviceShadow.systemNumber = systemNumber;
  return parsedDeviceShadow;
}

export const subscribeToDevice = (macAddress, onSubscribe, onUpdate) => {
  if (!macAddress) throw new Error('no mac address provided for device connection');

  // if no mqtt client, make one.
  if (!mqttClient) {
    createMqttClientConnection(() => {
      createDeviceSubscription(macAddress, onSubscribe, onUpdate);
    })
  } else {
    // If not currently subscribed to the provided mac/device. Create subscriptions.
    if (hasExistingSubscription) {
      return;
    } else {
      createDeviceSubscription(macAddress, onSubscribe, onUpdate);
    }
  }
}

const hasExistingSubscription = (macAddress) => {
  const store = getStore();
  const state = store.getState();
  return selectIsSubscribedToDevice(state, macAddress);
}

const createMqttClientConnection = (onConnect) => {
  const createMqttClient = (credentials) => {
    mqttClient = new AWSMqtt({
      accessKeyId: credentials.AccessKeyId,
      secretAccessKey: credentials.SecretKey,
      sessionToken: credentials.SessionToken,
      endpointAddress: awsDeviceShadowConfig.endpoint,
      region: awsDeviceShadowConfig.region,
    });

    mqttClient.on('connect', () => {
      console.log('connected to iot mqtt websocket');
      onConnect();
    });
  }

  // If no device shadow credentials exist, get them (currently insecure).
  if (!congnitoCredentials) {
    configureCognitoId((credentials) => {
      congnitoCredentials = credentials;
      createMqttClient(congnitoCredentials);
    });
  } else {
    // Otherwise, use the existing credentials.
    createMqttClient(congnitoCredentials);
  }
};

const createDeviceSubscription = (macAddress, onSubscribe, onUpdate) => {
  mqttClient.subscribe(updateAcceptedTopicName(macAddress));
  mqttClient.subscribe(updateRejectedTopicName(macAddress));

  mqttClient.on('message', (topic, message) => {
    // For debugging
    // console.log(`********* message received **********\n${topic}`);
    // console.log(JSON.parse(message).state.reported);

    if (topic === updateRejectedTopicName(macAddress)) {
      console.log('update rejected!');
      console.log(`${message.toString()}`);

    } else if (topic === updateAcceptedTopicName(macAddress)) {
      const messageJson = JSON.parse(message);
      if (messageJson.state && messageJson.state.reported) {
        const updatedShadowState = messageJson.state.reported

        // Do not update local state if the server is returning an empty update.
        // This happens as the device shadow periodically clears its state.
        if (Object.keys(updatedShadowState).every((key) => {
          return updatedShadowState[key] === null;
        })) return;

        // Do not update local state if the server is acknowledging a base request.
        // Subsequent requests will contain the device shadow data needed. We know the server
        // is responding to a base request if there is a R key in the payload with a value of:
        // "<number>,0," - which is what the regex below tests for.
        if (!!/[0-9]+,0,/.exec(updatedShadowState.R)) return;

        onUpdate(macAddress, updatedShadowState);
      }
    }
  });

  mqttClient.publish(updateTopicName(), createBaseRequestMessage(0));
  onSubscribe(macAddress);
};

const createMqttClient = (credentials, onConnect, onSubscribe) => {
  mqttClient = new AWSMqtt({
    accessKeyId: credentials.AccessKeyId,
    secretAccessKey: credentials.SecretKey,
    sessionToken: credentials.SessionToken,
    endpointAddress: awsDeviceShadowConfig.endpoint,
    region: awsDeviceShadowConfig.region,
  });

  mqttClient.on('connect', () => {
    console.log('connected to iot mqtt websocket');
    onConnect();
  });
}

export const retryShadowConnection = () => {
  if(!mqttClient) return;

  // Wait 3 seconds - this is the time it takes for the device shadow to clear its state. Then
  // follow up with 2 base request messages. For some reason the base request message only seems
  // to work if it is received by an empty device shadow, and 2 messages seems to be more reliable
  // than one. Not sure why...
  window.setTimeout(
    () => mqttClient.publish(updateTopicName(), createBaseRequestMessage(0)), 3000);
  window.setTimeout(
    () => mqttClient.publish(updateTopicName(), createBaseRequestMessage(0)), 4000);
}

const configureCognitoId = (onSuccess) => {
  // Initialize our configuration.
  aws.config.region = awsDeviceShadowConfig.region;

  aws.config.credentials = new aws.CognitoIdentityCredentials({
    IdentityPoolId: awsDeviceShadowConfig.poolId
  });

  // Attempt to authenticate to the Cognito Identity Pool.  Note that this
  // example only supports use of a pool which allows unauthenticated 
  // identities.
  var cognitoIdentity = new aws.CognitoIdentity();
  aws.config.credentials.get((err, data) => {
    if (!err) {
      console.log('retrieved shadow identity: ' + aws.config.credentials.identityId);
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
};

const parseDiscoverData = (discoverValues) => {
  return {
    rmCount: discoverValues[0],
  };
};

const parseSystemConfigurationData = (systemConfigValues) => {
  return {
    tempFormat: systemConfigValues[10],
  };
}

const parseVacationData = (vacationValues) => {
	const SYS_OFFSET = 1;
	const LENGTH_OFFSET = 0;
	const MONTH_OFFSET = 1;
	const DAY_OFFSET = 2;
	let parsedVacationData = {};

	// max of 20 vacations at any time
	let vacationDataArray = Array.from(new Array(20), (x,i) => {
		return {
			length: vacationValues[SYS_OFFSET+3*i+LENGTH_OFFSET],
			month: vacationValues[SYS_OFFSET+3*i+MONTH_OFFSET],
			day: vacationValues[SYS_OFFSET+3*i+DAY_OFFSET]
		}
	})

	vacationDataArray.forEach( (vacation, index) => {
		if (vacation.length > 0) {
			parsedVacationData[index] = {};
			// moments are mutable, be careful
			const startDate = moment(`${vacation.month}-${vacation.day}`, "M-D");
			const endDate = moment(startDate).add(vacation.length, 'days');
			if (endDate.isSameOrBefore(moment().subtract(1, 'days'))) {
				startDate.add(1, 'years');
				endDate.add(1, 'years');
			}
			parsedVacationData[index]['startDate'] = startDate;
			parsedVacationData[index]['endDate'] = endDate;
		}
	} )

  return parsedVacationData;
}

// Get specific zone update payload, needed so we only send exactly what
// has updated. Payload size must be kept to a minimum.
const getZoneUpdatePayload = (rawShadow, zoneId) => {
  let zoneUpdatePayload = {};
  Object.keys(rawShadow).forEach((key) => {
    if (key.charAt(0) === 'S') {
      const zoneNumber = key.split('S')[1];
      if (zoneNumber === zoneId.toString()) {
        zoneUpdatePayload[key] = rawShadow[key];
      }
    }
  });

  return zoneUpdatePayload;
}

// Get specific vacation update payload, needed so we only send exactly what
// has updated. Payload size must be kept to a minimum.
const getVacUpdatePayload = (rawShadow) => {
  let updatePayload = {};
  Object.keys(rawShadow).forEach((key) => {
    if (key === 'V') {
        updatePayload[key] = rawShadow[key];
		}
	});

  return updatePayload;
}

export const requestDeviceShadowForSystem = (systemNumber) => {
  mqttClient && mqttClient.publish(updateTopicName(), createBaseRequestMessage(systemNumber));
}
