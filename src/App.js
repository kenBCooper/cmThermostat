import React, { Component } from 'react';
import { connect } from 'react-redux';

import Router from './Router';
import { receiveDeviceUpdate } from './actions/AppActions';

class App extends Component {
    render() {
        return (
            <div>
                <Router/>
                <button type="button"
                        onClick={() => this.props.bootstrapData()}>
                    Bootstrap data
                </button>
            </div>
        );
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        bootstrapData: () => dispatch(receiveDeviceUpdate())
    }
}

export default connect(() => ({}), mapDispatchToProps)(App);
