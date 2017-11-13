import aws from 'aws-sdk';
import AWSMqtt from 'aws-mqtt-client';

import { awsConfig } from '../aws-configuration';
import { getCurrentSystemNumber } from './urlUtil';
import { STAT_PARSE_LIST, DIAGNOSTIC_PARSE_LIST } from './deviceShadowParseConfig';
import { DAY_NAMES, AM_PM_VALUES } from '../constants/ScheduleConstants';
import moment from 'moment';

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

let thingName = undefined;
let mqttClient;
let onShadowUpdate;
let onConnectionSuccess;
let congnitoCredentials;

const setThingName = (macAddress) => {
  // All 4 digit mac addresses will have a 9 hard-coded before
  if (macAddress.length === 4) {
    thingName = `5410ec49${macAddress}`;
  } else if (macAddress.length === 5){
    thingName = `5410ec4${macAddress}`;
  } else {
    thingName = macAddress;
  }
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

export const connectToDeviceShadow = (macAddress, onUpdate, onSuccess) => {
  if (!macAddress) throw new Error('no mac address provided for device connection');
  if (!thingName) setThingName(macAddress);

  // Save a reference to the onUpdate and onSuccess callbacks for future use when restarting
  // the connection.
  onShadowUpdate = onUpdate;
  onConnectionSuccess = onSuccess;

  let initialConnection = false;
  configureCognitoId((credentials) => {
    if (!congnitoCredentials) congnitoCredentials = credentials;
    if (!mqttClient) {
      mqttClient = new AWSMqtt({
        accessKeyId: credentials.AccessKeyId,
        secretAccessKey: credentials.SecretKey,
        sessionToken: credentials.SessionToken,
        endpointAddress: awsConfig.endpoint,
        region: awsConfig.region,
      });
    }

    mqttClient.on('connect', () => {
      console.log('connected to iot mqtt websocket');
      // Set up intial subscriptions if this is the first connection.
      if (!initialConnection) {
        mqttClient.subscribe(updateAcceptedTopicName());
        mqttClient.subscribe(updateRejectedTopicName());                
        initialConnection = true;
      }

      mqttClient.publish(updateTopicName(), createBaseRequestMessage(0));

     // // DUMMY FOR WHEN BOARD IS DOWN
     // onUpdate(JSON.parse(`{
     //   "R": "0,0,",
     //   "C": "0,144,45,0,4,2,0,3,0,20,0,2,0,0,6,11,8,4,43,1,17,",
     //   "D": "0,78,32,32,3,0,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,",
     //   "V": "0,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,2,",
     //   "DIS": "3,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,",
     //   "P": "0,1,2,3,4,",
     //   "S1": "0,0,75,90,88,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,7,0,0,3,3,1,0,70,75,25,0,",
     //   "S2": "0,0,75,83,81,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,3,3,1,0,70,75,25,0,",
     //   "S3": "0,0,75,83,81,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,3,3,1,0,70,75,25,0,",
     //   "S4": "0,0,75,83,81,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,3,3,1,0,70,75,25,0,",
     //   "S5": "0,1,75,83,81,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,3,3,1,2,70,75,25,0,",
     //   "S6": "0,0,75,83,81,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,3,3,1,0,70,75,25,0,",
     //   "S7": "0,0,75,83,81,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,3,3,1,0,70,75,25,0,"
     // }`));

     // onUpdate(JSON.parse(`{
     //   "D": "1,78,32,32,3,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,",
     //   "S1": "1,0,75,90,88,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,7,0,0,3,3,1,0,70,75,25,0,",
     //   "S2": "1,0,75,83,81,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,3,3,1,0,70,75,25,0,",
     //   "S3": "1,0,75,83,81,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,3,3,1,0,70,75,25,0,"
     // }`));

     // onUpdate(JSON.parse(`{
     //   "D": "2,78,32,32,3,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,",
     //   "S1": "2,0,75,90,88,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,7,0,0,3,3,1,0,70,75,25,0,",
     //   "S2": "2,0,75,83,81,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,3,3,1,0,70,75,25,0,",
     //   "S3": "2,0,75,83,81,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,3,3,1,0,70,75,25,0,"
     // }`));

     // onUpdate(JSON.parse(`{
     //   "D": "3,78,32,32,3,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,",
     //   "S1": "3,0,75,90,88,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,7,0,0,3,3,1,0,70,75,25,0,",
     //   "S2": "3,0,75,83,81,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,3,3,1,0,70,75,25,0,",
     //   "S3": "3,0,75,83,81,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,3,3,1,0,70,75,25,0,"
     // }`));
    });

    mqttClient.on('message', (topic, message) => {
      // For debugging
      // console.log(`********* message received **********\n${topic}`);
      // console.log(JSON.parse(message).state.reported);

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
          // Do not update local state if the server is acknowledging a base request.
          // Subsequent requests will contain the device shadow data needed. We know the server
          // is responding to a base request if there is a R key in the payload with a value of:
          // "<number>,0," - which is what the regex below tests for.
          if (!!/[0-9]+,0,/.exec(updatedShadowState.R)) return;

          onUpdate(updatedShadowState);
        }
      }
    });

    onSuccess(mqttClient);
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

  // Do we need to completely re-establish connection? or does this do the trick?
  // mqttClient.end(false, () => {
  //   mqttClient = null;
  //   connectToDeviceShadow(thingName, onShadowUpdate, onConnectionSuccess);
  // });
}

const configureCognitoId = (onSuccess) => {
  // Initialize our configuration.
  aws.config.region = awsConfig.region;

  aws.config.credentials = new aws.CognitoIdentityCredentials({
    IdentityPoolId: awsConfig.poolId
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

// Given a device shadow object, return the zones that apply to the currently displayed
// system (GenX or RM).
export const getZonesForCurrentSystem = (deviceShadow) => {
  const systemNumber = getCurrentSystemNumber();
  const currentSystem = deviceShadow[systemNumber];
  if (currentSystem) {
    return currentSystem.zones
  } else {
    requestDeviceShadowForSystem(systemNumber);
    return undefined;
  }
}

// Given a device shadow object, return the diagnostic data that applies to the currently displayed
// system (GenX or RM).
export const getDiagnosticForCurrentSystem = (deviceShadow) => {
  const systemNumber = getCurrentSystemNumber();
  const currentSystem = deviceShadow[systemNumber];
  if (currentSystem) {
    return currentSystem.diagnostics
  } else {
    requestDeviceShadowForSystem(systemNumber);
    return undefined;
  }
}

export const getMomentsForCurrentSchedules = (schedules) => {
	// schedules: zone -> day -> start/ends
	let moments = {};
	Object.keys(schedules).forEach( (zone) => {
		moments[zone] = {};
		Object.keys(schedules[zone]).forEach( (day) => {
			let dayTimes = schedules[zone][day];
			let startMoment = moment(`${dayTimes.startHour}:${dayTimes.startMinute} ${dayTimes.startAmPm}`, 'h:mm a')
			let endMoment = moment(`${dayTimes.endHour}:${dayTimes.endMinute} ${dayTimes.endAmPm}`, 'h:mm a')
			moments[zone][day] = {
				startMoment: startMoment,
				endMoment: endMoment,
			}
		} )
	} )
	return moments;
}

export const getSchedulesForCurrentSystem = (deviceShadow) => {
  const systemNumber = getCurrentSystemNumber();
  const currentSystem = deviceShadow[systemNumber];
  let systemSchedules = {};
  Object.keys(currentSystem.zones).forEach((zoneNumber) => {
    systemSchedules[zoneNumber] = getSchedulesForZone(currentSystem.zones[zoneNumber]);
  });

  return systemSchedules;
}

const getSchedulesForZone = (zone) => {
  let zoneSchedule = {};
  Object.keys(DAY_NAMES).forEach((dayName) => {
    zoneSchedule[dayName] = {
      startHour: formatHourOrMinuteString(
        zone[`${DAY_NAMES[dayName]}OccupiedHour`]
      ),
      startMinute: formatHourOrMinuteString(
        zone[`${DAY_NAMES[dayName]}OccupiedMinute`]
      ),
      startAmPm: getAmPmString(
        zone[`${DAY_NAMES[dayName]}OccupiedAmPm`]
      ),
      endHour: formatHourOrMinuteString(
        zone[`${DAY_NAMES[dayName]}UnoccupiedHour`]
      ),
      endMinute: formatHourOrMinuteString(
        zone[`${DAY_NAMES[dayName]}UnoccupiedMinute`]
      ),
      endAmPm: getAmPmString(
        zone[`${DAY_NAMES[dayName]}UnoccupiedAmPm`]
      ),
    }
  });

  return zoneSchedule;
}

const getAmPmString = (value) => {
  return AM_PM_VALUES[value] || 'AM' //Fall back to AM if the value is invalid
}

const formatHourOrMinuteString = (numberString) => {
  if (numberString.length > 1) {
    return numberString;
  } else if (numberString.length === 1) {
    return `0${numberString}`;
  } else {
    return '00';
  }
}

export const getVacationsForCurrentSystem = (deviceShadow) => {
  const systemNumber = getCurrentSystemNumber();
  const currentSystem = deviceShadow[systemNumber];
  if (currentSystem) {
    return currentSystem.vacations
  } else {
    requestDeviceShadowForSystem(systemNumber);
    return undefined;
  }
}

const requestDeviceShadowForSystem = (systemNumber) => {
  mqttClient.publish(updateTopicName(), createBaseRequestMessage(systemNumber));
}

