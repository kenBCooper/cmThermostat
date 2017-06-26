import React, { Component } from 'react';
import { connect } from 'react-redux';

import Router from './Router';
import { updateDeviceShadow, setConnectedStatus } from './actions/AppActions';
import { connectToDeviceShadow } from './util/deviceShadowUtil';

class App extends Component {
    constructor(props) {
        super(props);
        connectToDeviceShadow(
            props.onDeviceUpdate,
            props.onSuccessfulDeviceConnection
        );
    }

    render() {
        return (
            <div>
                <Router/>
            </div>
        );
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        onDeviceUpdate: (message) => dispatch(updateDeviceShadow(message)),
        onSuccessfulDeviceConnection: () => dispatch(setConnectedStatus())
    }
}

export default connect(() => ({}), mapDispatchToProps)(App);
