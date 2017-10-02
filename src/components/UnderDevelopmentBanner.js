import React, { Component } from 'react';

const styles = {
  padding: '10px',
  margin: '0px 3px',
  textAlign: 'center',
  borderRadius: '5px',
  cursor: 'pointer',
  border: '2px solid #dadada',
}

class UnderDevelopmentBanner extends Component {
  constructor(props) {
    super(props);

    this.state = {
      display: true,
    };
  }

  render() {
    styles.display = this.state.display ? 'block' : 'none';

    return (
      <div onClick={() => {
        this.setState({
          display: false
        });
      }} style={styles} className="under-development-message">Warning: This page is currently under development</div>
    );
  }
}

export default UnderDevelopmentBanner;