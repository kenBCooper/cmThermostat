import React from 'react';
import { BrowserRouter, Route, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';

import ZoneList from './components/ZoneList';
import ZoneDetail from './components/ZoneDetail';
import NavHeader from './components/NavHeader';
import Diagnostics from './components/Diagnostics';
import Login from './components/Login';

const Router = (props) => {
  const isLoggedIn = isAuthenticated(props.userInfo);
  return (
    <BrowserRouter>
        <div>
            { isLoggedIn ? (<NavHeader />) : null}
            <div className="container">
              <LoggedOutOnlyRoute exact
                authStatus={isLoggedIn}
                path="/login"
                component={Login}/>
              <PrivateRoute exact
                authStatus={isLoggedIn}
                path="/"
                component={ZoneList}/>
              <PrivateRoute
                authStatus={isLoggedIn}
                path="/d"
                component={Diagnostics}/>
              <PrivateRoute
                authStatus={isLoggedIn}
                path="/:zoneId"
                component={ZoneDetail}/>
            </div>
        </div>
    </BrowserRouter>
  );
}

const isAuthenticated = (userInfo) => {
  // The only thing we currently need form a logged in user is the mac address,
  // so for now, we will use that as the determining factor as to someone is authenticated or not.
  return !!userInfo.mac;
}

// Any LoggedOutOnlyRoute will redirect you to the app home page if you try to navigate to
// it while logged in.
const LoggedOutOnlyRoute = ({ component: Component, ...rest }) => {
  const authStatus = rest.authStatus;

  const renderRoute = (props) => (
    authStatus ? (
      <Redirect to={{
        pathname: '/',
        state: { from: props.location }
      }}/>
    ) : (
      <Component {...props}/>
    )
  );

  return (
    <Route {...rest} render={renderRoute}/>
  )
}

// Any PrivateRoute will redirect you to the login page if you try to navigate to it while not
// logged in.
const PrivateRoute = ({ component: Component, ...rest }) => {
  const authStatus = rest.authStatus;

  const renderRoute = (props) => (
    authStatus ? (
      <Component {...props}/>
    ) : (
      <Redirect to={{
        pathname: '/login',
        state: { from: props.location }
      }}/>
    )
  );

  return (
    <Route {...rest} render={renderRoute}/>
  )
}

const mapStateToProps = (state) => {
    return {
        userInfo: state.user,
    }
}

export default connect(mapStateToProps, undefined)(Router);
