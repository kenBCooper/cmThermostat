import React, { Component } from 'react';
import { connect } from 'react-redux';
import {
  Button,
  FormGroup,
  FormControl,
  ControlLabel,
  Panel,
} from 'react-bootstrap';
import {
  CognitoUserPool,
  AuthenticationDetails,
  CognitoUser
} from 'amazon-cognito-identity-js';
import { setUserInfo, receiveDeviceShadowUpdate, setConnectedStatus } from '../actions/AppActions';
import { connectToDeviceShadow } from '../util/deviceShadowUtil';
import './Login.css';
import './Panel.css';

const awsConfig = {
  // Cognito Identity Pool ID
  poolId: 'us-west-2_9hA0zhwrb',
  // Application ID for Cognito group.
  appClientId: '6s97aeq6n5kgk0ell2g6ebet1l',
  // AWS Region
  region: 'us-west-2',
  // Unique deviceshadow endpoint
  endpoint: 'a22i2y89l436o4.iot.us-west-2.amazonaws.com',
  // Custom attribute name for mac address,
  macAttrName: 'custom:mac',
};

const LOGIN_SUCCESS_REDIRECT = '/0';

class Login extends Component {
  constructor(props) {
    super(props);

    // For testing
    // this.state = {
    //   username: 'kev.r.cox90+test1@gmail.com',
    //   password: 'Kevin1..',
    // };
    this.state = {
      username: '',
      password: '',
    };
  }

  login(username, password) {
    const userPool = new CognitoUserPool({
      UserPoolId: 'us-west-2_BcvxalBCi',
      ClientId: '4e89ncs6eab4e9s75fqb0ep9uj',
    });
    const authenticationData = {
      Username: username,
      Password: password,
    };

    const user = new CognitoUser({ Username: username, Pool: userPool });
    this.setState({
      user,
    });

    const authenticationDetails = new AuthenticationDetails(authenticationData);

    return new Promise((resolve, reject) => (
      user.authenticateUser(authenticationDetails, {
        onSuccess: (result) => resolve(result),
        onFailure: (err) => {reject(err)},
      })
    ));
  }

  validateForm() {
    return this.state.username.length > 0
      && this.state.password.length > 0;
  }

  handleChange = (event) => {
    this.setState({
      [event.target.id]: event.target.value
    });
  }

  handleSubmit(event) {
    event.preventDefault();

    const afterLogin = (result) => {
        const accessToken = result.getAccessToken().getJwtToken();
        const idToken = result.getIdToken().getJwtToken();
        const refreshToken = result.getRefreshToken().getToken();

        const user = this.state.user;
        user.getUserAttributes((err, result) => {
          const userMacAddressAttr = 
            result.find(function(attribute){return attribute.Name === awsConfig.macAttrName});
          if (!userMacAddressAttr) {
            const error = 
              new Error('No mac address found this user. Please contact your administrator to set up this account.');
            throw error;
          }
          this.props.onLogin({
            accessToken,
            idToken,
            refreshToken,
            mac: userMacAddressAttr.Value,
          });

          connectToDeviceShadow(
              userMacAddressAttr.Value,
              this.props.onDeviceUpdate,
              this.props.onSuccessfulDeviceConnection
          );

          this.props.history.push(LOGIN_SUCCESS_REDIRECT);
        });
    };

    // Attempt login with currently entered credentials, executing the afterLogin function defined above
    // if the login is successful.
    this.login(this.state.username, this.state.password).then(afterLogin).catch((err) => alert(err));
  }

  render() {
    return (
      <Panel className='custom-panel login-panel'>
        <div className="Login">
          <form onSubmit={(evt) => this.handleSubmit(evt)}>
            <FormGroup controlId="username" bsSize="large">
              <ControlLabel>Email</ControlLabel>
              <FormControl
                autoFocus
                value={this.state.username}
                onChange={this.handleChange} />
            </FormGroup>
            <FormGroup controlId="password" bsSize="large">
              <ControlLabel>Password</ControlLabel>
              <FormControl
                value={this.state.password}
                onChange={this.handleChange}
                type="password" />
            </FormGroup>
            <Button
              block
              bsSize="large"
              disabled={ ! this.validateForm() }
              type="submit">
              Login
            </Button>
          </form>
        </div>
      </Panel>
    );
  }
}

const mapDispatchToProps = (dispatch) => {
    return {
        onLogin: (userInfo) => dispatch(setUserInfo(userInfo)),
        onDeviceUpdate: (message) => dispatch(receiveDeviceShadowUpdate(message)),
        onSuccessfulDeviceConnection: () => dispatch(setConnectedStatus())
    }
}

export default connect(undefined, mapDispatchToProps)(Login);
