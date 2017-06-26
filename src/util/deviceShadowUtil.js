import aws from 'aws-sdk';
import AWSMqtt from 'aws-mqtt-client';
import awsConfiguration from '../aws-configuration';

const THING_NAME = '5410ec49e4c5';

const UPDATE_ACCEPTED_TOPIC = `$aws/things/${THING_NAME}/shadow/update/accepted`;
const UPDATE_REJECTED_TOPIC = `$aws/things/${THING_NAME}/shadow/update/rejected`;
const UPDATE_TOPIC = `$aws/things/${THING_NAME}/shadow/update`;
const BASE_REQUEST_MESSAGE = '{"state": {"reported":{"R":"0,0,"}}}';

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

const parseZoneData = (zoneValues) => {
    let parsedZoneData = {};
    zoneValues.forEach((value, index) => {
        if (STAT_PARSE_LIST[index]) {
            parsedZoneData[STAT_PARSE_LIST[index]] = zoneValues[index];
        }
    });

    return parsedZoneData;
}

export const parseDeviceShadow = (rawDeviceShadow) => {
    let parsedDeviceShadow = {
        zones: {},
    };

    Object.keys(rawDeviceShadow).forEach((key) => {
        let values = rawDeviceShadow[key];
        if (values.charAt(values.length - 1) === ',') {
            values = values.slice(0, -1);
        }
        const valuesArr = values.split(',');

        if (key.charAt(0) === 'S') {
            const zoneNumber = parseInt(key.split('S')[1]);
            const zoneData = parseZoneData(valuesArr);
            parsedDeviceShadow.zones[zoneNumber] = zoneData;
        }
    });

    return parsedDeviceShadow;
}

export const connectToDeviceShadow = (onUpdate, onSuccess) => {
    let initialConnection = false;

    configureCognitoId((credentials) => {
        const mqttClient = new AWSMqtt({
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
                mqttClient.subscribe(UPDATE_ACCEPTED_TOPIC);
                mqttClient.subscribe(UPDATE_REJECTED_TOPIC);                
                initialConnection = true;
            }

            mqttClient.publish(UPDATE_TOPIC, BASE_REQUEST_MESSAGE);
        });

        mqttClient.on('message', (topic, message) => {
            if (topic === UPDATE_REJECTED_TOPIC) {
                console.log('update rejected!');
                console.log(`${message.toString()}`);
            } else if (topic === UPDATE_ACCEPTED_TOPIC) {
                const messageJson = JSON.parse(message);
                if (messageJson.state && messageJson.state.reported) {
                    const updatedShadowState = messageJson.state.reported

                    if (Object.keys(updatedShadowState).every((key) => {
                            return updatedShadowState[key] === null;
                        })) return;

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
