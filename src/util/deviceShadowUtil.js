import aws from 'aws-sdk';
import AWSMqtt from 'aws-mqtt-client';
import moment from 'moment';

import { getStore } from './reduxUtil';
import { selectCurrentGenX, selectIsSubscribedToDevice } from '../selectors/AppSelectors';
import { awsDeviceShadowConfig } from '../aws-configuration';
import { STAT_PARSE_LIST, DIAGNOSTIC_PARSE_LIST } from './deviceShadowParseConfig';
import { DAY_NAMES, AM_PM_VALUES } from '../constants/ScheduleConstants';

// 3 sec debounce per unique zone update.
const UPDATE_DEBOUNCE_TIME = 1000;

// // Data structure for PENDING_UPDATES
// PENDING UPDATES = {
//   macAddress: {
//     systemNumber: {
//       <V (vacation) or Z (zones) or C(config)>: {
//         timeout: window.timeout,
//         payload: <updated device shadow object>
//       }
//     }
//   }
// }

const PENDING_UPDATES = {};
const VACATION_UPDATE = 'V';
const ZONE_UPDATE = 'Z';
const CONFIG_UPDATE = 'C';
const NAME_UPDATE = 'N';

let mqttClient;
let congnitoCredentials;

const updateAcceptedTopicName = (macAddress) => {
  return `$aws/things/${macAddress}/shadow/update/accepted`;
}

const updateRejectedTopicName = (macAddress) => {
  return `$aws/things/${macAddress}/shadow/update/rejected`;
}

// macAddress is an optional argument - if not included, the currently selected
// genx/mac in the app will be used.
const updateTopicName = (macAddress) => {
  if (!macAddress) {
    macAddress = getCurrentMacAddress();
  }
  return `$aws/things/${macAddress}/shadow/update`;
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
        R: `${systemNumber},0,`,
      },
    },
  });
}

const createNameRequestMessage = (systemNumber) => {
  return JSON.stringify({
    state: {
      desired: {
        ZN: `${systemNumber},`,
      },
    },
  });
}

const createNameNullMessage = (systemNumber) => {
  return JSON.stringify({
    state: {
      desired: {
        ZN: null,
      },
    },
  });
}

const getPendingUpdate = (macAddress, systemNumber, updateKey) => {
  const pendingUpdatesForMac = PENDING_UPDATES[macAddress] || {};
  const pendingUpdatesForSystem = pendingUpdatesForMac[systemNumber] || {};
  return pendingUpdatesForSystem[updateKey] || {};
}

const clearPendingUpdate = (macAddress, systemNumber, updateKey) => {
  const pendingUpdatesForMac = PENDING_UPDATES[macAddress] || {};
  const pendingUpdatesForSystem = pendingUpdatesForMac[systemNumber] || {};

  PENDING_UPDATES[macAddress] = {
    ...pendingUpdatesForMac,
    [systemNumber]: {
      ...pendingUpdatesForSystem,
      [updateKey]: {},
    },
  };
}

const setPendingUpdate = (macAddress, systemNumber, updateKey, timeout, payload) => {
  const pendingUpdatesForMac = PENDING_UPDATES[macAddress] || {};
  const pendingUpdatesForSystem = pendingUpdatesForMac[systemNumber] || {};

  PENDING_UPDATES[macAddress] = {
    ...pendingUpdatesForMac,
    [systemNumber]: {
      ...pendingUpdatesForSystem,
      [updateKey]: {
        timeout,
        payload,
      },
    },
  };
}

export const publishDeviceShadowZoneUpdate = (updatedShadow, macAddress, systemNumber, zoneId) => {
  // If an update is pending for this specific system, replace it with the latest
  // update.
  const pendingUpdate = getPendingUpdate(macAddress, systemNumber, ZONE_UPDATE);
  if (pendingUpdate.timeout) clearTimeout(pendingUpdate.timeout);

  let nextUpdatePayload = getZoneUpdatePayload(updatedShadow, zoneId);

  if (pendingUpdate.payload) {
    nextUpdatePayload = mergeUpdatePayloads(nextUpdatePayload, pendingUpdate.payload);
  }

  const nextUpdate = setTimeout(() => {
    const updatePayload = {
      state: {
        reported: nextUpdatePayload
      },
    };

    mqttClient.publish(updateTopicName(), JSON.stringify(updatePayload));
    clearPendingUpdate(macAddress, systemNumber, ZONE_UPDATE);
  }, UPDATE_DEBOUNCE_TIME);

  setPendingUpdate(macAddress, systemNumber, ZONE_UPDATE, nextUpdate, nextUpdatePayload);
}

export const publishDeviceShadowNameUpdate = (updatedShadow, macAddress, systemNumber, zoneId) => {
  // If an update is pending for this specific system, replace it with the latest
  // update.
  const pendingUpdate = getPendingUpdate(macAddress, systemNumber, NAME_UPDATE);
  if (pendingUpdate.timeout) clearTimeout(pendingUpdate.timeout);

  let nextUpdatePayload = getNameUpdatePayload(updatedShadow, zoneId);

  const nextUpdate = setTimeout(() => {
    const updatePayload = {
      state: {
        desired: nextUpdatePayload
      },
    };

    mqttClient.publish(updateTopicName(), JSON.stringify(updatePayload));
    clearPendingUpdate(macAddress, systemNumber, NAME_UPDATE);
  }, UPDATE_DEBOUNCE_TIME);

  setPendingUpdate(macAddress, systemNumber, NAME_UPDATE, nextUpdate, nextUpdatePayload);
}

export const publishDeviceShadowConfigUpdate = (updatedShadow, macAddress, systemNumber) => {
  // If an update is pending for this specific system, replace it with the latest
  // update.
  const pendingUpdate = getPendingUpdate(macAddress, systemNumber, CONFIG_UPDATE);
  if (pendingUpdate.timeout) clearTimeout(pendingUpdate.timeout);

  const nextUpdatePayload = getConfigUpdatePayload(updatedShadow);

  const nextUpdate = setTimeout(() => {
    const updatePayload = {
      state: {
        reported: nextUpdatePayload
      }
    };

    mqttClient.publish(updateTopicName(), JSON.stringify(updatePayload));
    clearPendingUpdate(macAddress, systemNumber, CONFIG_UPDATE);
  }, UPDATE_DEBOUNCE_TIME);

  setPendingUpdate(macAddress, systemNumber, CONFIG_UPDATE, nextUpdate, nextUpdatePayload);
}

export const publishDeviceShadowVacationUpdate = (updatedShadow, macAddress, systemNumber) => {
  // If an update is pending for this specific system, replace it with the latest
  // update.
  const pendingUpdate = getPendingUpdate(macAddress, systemNumber, VACATION_UPDATE);
  if (pendingUpdate.timeout) clearTimeout(pendingUpdate.timeout);

  const nextUpdatePayload = getVacUpdatePayload(updatedShadow);

  const nextUpdate = setTimeout(() => {
    const updatePayload = {
      state: {
        reported: nextUpdatePayload
      }
    };

    mqttClient.publish(updateTopicName(), JSON.stringify(updatePayload));
    clearPendingUpdate(macAddress, systemNumber, VACATION_UPDATE);
  }, UPDATE_DEBOUNCE_TIME);

  setPendingUpdate(macAddress, systemNumber, VACATION_UPDATE, nextUpdate, nextUpdatePayload);
}

const mergeUpdatePayloads = (newPayload, pendingPayload) => {
  return Object.assign({}, pendingPayload, newPayload);
}

// Update raw shadow with new values in the updateShadowObject.
// Return the new raw shadow for storage.
export const updateRawDeviceShadow = (rawShadow, updateShadowObject) => {
  Object.keys(rawShadow).forEach((key) => {
    let rawValues = rawShadow[key];
    if (rawValues.charAt(rawValues.length - 1) === ',') {
      rawValues = rawValues.slice(0, -1);
    }
    const rawValuesArr = rawValues.split(',');

    if (key.charAt(0) === 'S') {
      const zoneNumber = parseInt(key.split('S')[1], 10);
      const zoneValues = updateShadowObject.zones[zoneNumber];

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
		} else if (key === 'C') {
      rawValuesArr[10] = updateShadowObject.systemConfig.tempFormat;
      rawShadow[key] = rawValuesArr.join(',') + ',';
    } else if (key === 'N') {
      const systemNumber = parseInt(rawShadow.N.split(',')[0], 10);
      // updates handled by the backend lambda functions do not add a trailing comma - unlike the other updates.
      rawShadow.N = `${systemNumber},${Object.values(updateShadowObject.names).join(',')}`;
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
    } else if (key === 'N') {
      const namesData = parseNamesData(valuesArr);
      parsedDeviceShadow.names = namesData;
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

export const subscribeToDevices = (macList, onSubscribe, onUpdate) => {
  if (!macList || !macList.length) {
    throw new Error('no mac address provided for device connection');
  }

  if (!mqttClient) {
    createMqttClientConnection(() => {
      createDeviceSubscriptions(macList, onSubscribe, onUpdate);
    });
  } else {
    createDeviceSubscriptions(macList, onSubscribe, onUpdate);
  }
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

const createDeviceSubscriptions = (macList, onSubscribe, onUpdate) => {
  macList.forEach((macAddress) => {
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

    // Request base system and name data.
    requestNamesForSystem(0, macAddress);
    requestDeviceShadowForSystem(0, macAddress);

    onSubscribe(macAddress);

    // Now that we know the mac list, redefine the retry connection function to issue requests to the
    // proper mqtt topics.
    retryShadowConnection = () => {
      macList.forEach((macAddress) => {
        // Wait 3 seconds - this is the time it takes for the device shadow to clear its state. Then
        // follow up with 2 base request messages. For some reason the base request message only seems
        // to work if it is received by an empty device shadow.
        requestNamesForSystem(0, macAddress);
        window.setTimeout(
          () => mqttClient.publish(updateTopicName(macAddress), createBaseRequestMessage(0, macAddress)), 3000);
      });
    }
  });
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

const parseNamesData = (namesValues) => {
  const parsedNamesData = {};
  namesValues.slice(1).forEach((value, index) => {
    parsedNamesData[index] = value;
  });

  return parsedNamesData;
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
  const rawShadowKeyForZone = `S${zoneId}`;
  return {
    [rawShadowKeyForZone]: rawShadow[rawShadowKeyForZone] || {},
  };
}

const getNameUpdatePayload = (rawShadow) => {
  return {
    ZU: rawShadow['N'] || {},
  }
}

const getConfigUpdatePayload = (rawShadow) => {
  return {
    C: rawShadow['C'] || {},
  };
}

const getVacUpdatePayload = (rawShadow) => {
  return {
    V: rawShadow['V'] || {},
  };
}

// macAddress is an optional argument - if not included, the currently selected
// genx/mac in the app will be used.
export const requestDeviceShadowForSystem = (systemNumber, macAddress) => {
  if (mqttClient) {
    mqttClient.publish(updateTopicName(macAddress), createBaseRequestMessage(systemNumber));
    // If the first request did not work - which happens quite a bit... - wait 3 seconds.
    // this is the time it takes for the device shadow to clear its state. Then
    // follow up with a base request message.
    window.setTimeout(
      () => mqttClient.publish(updateTopicName(macAddress), createBaseRequestMessage(0)), 3500);
  }
}

// macAddress is an optional argument - if not included, the currently selected
// genx/mac in the app will be used.
export const requestNamesForSystem = (systemNumber, macAddress) => {
  if (mqttClient) {
    mqttClient.publish(updateTopicName(macAddress), createNameRequestMessage(systemNumber));
    // This is required for the name backend to stop sending name messages.
    mqttClient.publish(updateTopicName(macAddress), createNameNullMessage());
    // Send a second after timeout to ensure the backend stops sending name messages.
    setTimeout(() => mqttClient.publish(updateTopicName(macAddress), createNameNullMessage()), 500);
  }
}

// This function redefined once device subscriptions are set up.
export let retryShadowConnection = () => null;
