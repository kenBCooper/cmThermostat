import React from 'react';
import { BrowserRouter, Route, Redirect, Switch } from 'react-router-dom';
import { connect } from 'react-redux';

import { selectIsCurrentSystemLoaded, selectUserInfo } from './selectors/AppSelectors';
import AppPanel from './components/AppPanel';
import ZoneList from './components/ZoneList';
import Diagnostics from './components/Diagnostics';
import Schedule from './components/Schedule';
import Login from './components/Login';
import LoadingIndicator from './components/LoadingIndicator';

const Router = (props) => {
  const isLoggedIn = isAuthenticated(props.userInfo);
  const isCurrentSystemLoading = props.isCurrentSystemLoading;

  return (
    <BrowserRouter>
      <div>
        <AppPanel isLoggedIn={isLoggedIn}>
          <Switch>
            <LoggedOutOnlyRoute exact
              isLoggedIn={isLoggedIn}
              path="/login"
              component={Login}/>
            <PrivateRoute
              isLoggedIn={isLoggedIn}
              isLoading={isCurrentSystemLoading}
              path="/d"
              component={Diagnostics}/>
            <PrivateRoute
              isLoggedIn={isLoggedIn}
              isLoading={isCurrentSystemLoading}
              path="/s"
              component={Schedule}/>
            <PrivateRoute
              isLoggedIn={isLoggedIn}
              isLoading={isCurrentSystemLoading}
              path="/z"
              component={ZoneList}/>
            <PrivateRoute
              isLoggedIn={isLoggedIn}
              isLoading={isCurrentSystemLoading}
              component={ZoneList}/>
          </Switch>
        </AppPanel>
      </div>
    </BrowserRouter>
  );
}

const isAuthenticated = (userInfo) => {
  // The only thing we currently need form a logged in user is the mac address,
  // so for now, we will use that as the determining factor as to someone is authenticated or not.
  return !!userInfo.macList.length;
}

// Any LoggedOutOnlyRoute will redirect you to the app home page if you try to navigate to
// it while logged in.
const LoggedOutOnlyRoute = ({ component: Component, ...rest }) => {
  const isLoggedIn = rest.isLoggedIn;

  const renderRoute = (props) => (
    isLoggedIn ? (
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
  const isLoggedIn = rest.isLoggedIn;
  const isLoading = rest.isLoading;

  const renderRoute = (props) => {
    if (!isLoggedIn) {
      return (
        <Redirect to={{
          pathname: '/login',
          state: { from: props.location }
        }}/>
      );
    }

    if (isLoading) {
      return <LoadingIndicator />;
    }

    return <Component {...props}/>;
  }

  return (
    <Route {...rest} render={renderRoute}/>
  )
}

const mapStateToProps = (state) => {
  return {
    userInfo: selectUserInfo(state),
    isCurrentSystemLoading: !selectIsCurrentSystemLoaded(state),
  }
}

export default connect(mapStateToProps, undefined)(Router);
