import * as helpers from './todoHelpers';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Shell } from './views/shell';

const shell = <Shell />;
ReactDOM.render(shell, document.getElementById('content'));