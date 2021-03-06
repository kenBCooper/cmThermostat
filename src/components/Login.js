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
import { awsUserPoolConfig } from '../aws-configuration.js'
import { receiveUserInfo, receiveDeviceShadowUpdate, setSubscriptionStatus } from '../actions/AppActions';
import { connectToDeviceShadow, subscribeToDevices } from '../util/deviceShadowUtil';
import './Login.css';
import './Panel.css';

const LOGIN_SUCCESS_REDIRECT = '/zones';

class Login extends Component {
  constructor(props) {
    super(props);

    this.state = {
      username: '',
      password: '',
    };
  }

  login = (username, password) => {
    const userPool = new CognitoUserPool({
      UserPoolId: awsUserPoolConfig.poolId,
      ClientId: awsUserPoolConfig.appClientId,
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
    const afterLogin = this.afterLogin;

    user.authenticateUser(authenticationDetails, {
      onSuccess: afterLogin,
      onFailure: err => console.log(err),
    });
  }

  afterLogin = (result) => {
    const accessToken = result.getAccessToken().getJwtToken();
    const idToken = result.getIdToken().getJwtToken();
    const refreshToken = result.getRefreshToken().getToken();

    const user = this.state.user;
    user.getUserAttributes((err, result) => {
      const userMacAddressAttr = 
        result.find(function(attribute){return attribute.Name === awsUserPoolConfig.macAttrName});
      if (!userMacAddressAttr) {
        const error = 
          new Error('No mac address found this user. Please contact your administrator to set up this account.');
        throw error;
      }

      const combinedMacString = userMacAddressAttr.Value || '';
      const macList = combinedMacString.match(/.{12}/g) || [];

      this.props.onLogin({
        accessToken,
        idToken,
        refreshToken,
        macList,
      });

      subscribeToDevices(
        macList,
        this.props.onDeviceSubscription,
        this.props.onDeviceUpdate,
      )

      this.props.history.push(LOGIN_SUCCESS_REDIRECT);
    });
  };

  validateForm() {
    return this.state.username.length > 0
      && this.state.password.length > 0;
  }

  handleChange = (event) => {
    this.setState({
      [event.target.id]: event.target.value
    });
  }

  handleSubmit = event => {
    event.preventDefault();
    // Attempt login with currently entered credentials
    this.login(this.state.username, this.state.password);
  }

  render() {
    return (
      <Panel className='custom-panel login-panel'>
        <div className="Login">
          <form onSubmit={this.handleSubmit}>
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
    onLogin: (userInfo) => dispatch(receiveUserInfo(userInfo)),
    onDeviceUpdate: (macAddress, message) => dispatch(receiveDeviceShadowUpdate(macAddress, message)),
    onDeviceSubscription: (macAddress) => dispatch(setSubscriptionStatus(macAddress))
  }
}

export default connect(undefined, mapDispatchToProps)(Login);
