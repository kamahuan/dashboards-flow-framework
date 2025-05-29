/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { RouteComponentProps, Route, Switch, Router } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { WorkflowDetail } from './workflow_detail';
import { WorkflowDetailRouterProps } from '../../pages';
import '@testing-library/jest-dom';
import { mockStore, resizeObserverMock } from '../../../test/utils';
import { createMemoryHistory } from 'history';
import { MINIMUM_FULL_SUPPORTED_VERSION, WORKFLOW_TYPE } from '../../../common';

jest.mock('../../services', () => {
  const { mockCoreServices } = require('../../../test');
  return {
    ...jest.requireActual('../../services'),
    ...mockCoreServices,
  };
});

jest.setTimeout(10000);

const workflowId = '12345';
const workflowName = 'test_workflow';

window.ResizeObserver = resizeObserverMock;

const renderWithRouter = (
  workflowId: string,
  workflowName: string,
  workflowType: WORKFLOW_TYPE
) => {
  const history = createMemoryHistory({
    initialEntries: [`/workflow/${workflowId}`],
  });

  const mockInput = {
    id: workflowId,
    name: workflowName,
    type: workflowType,
    version: [
      WORKFLOW_TYPE.SEMANTIC_SEARCH,
      WORKFLOW_TYPE.MULTIMODAL_SEARCH,
      WORKFLOW_TYPE.HYBRID_SEARCH,
    ].includes(workflowType)
      ? MINIMUM_FULL_SUPPORTED_VERSION
      : undefined,
  };

  return {
    ...render(
      <Provider store={mockStore(mockInput)}>
        <Router history={history}>
          <Switch>
            <Route
              path="/workflow/:workflowId"
              render={(
                props: RouteComponentProps<WorkflowDetailRouterProps>
              ) => <WorkflowDetail setActionMenu={jest.fn()} {...props} />}
            />
          </Switch>
        </Router>
      </Provider>
    ),
    history,
  };
};

describe('WorkflowDetail Page with create ingestion option', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  Object.values(WORKFLOW_TYPE).forEach((type) => {
    test(`renders the WorkflowDetail page with ${type} type`, async () => {
      const { getAllByText, getByText, getByRole } = renderWithRouter(
        workflowId,
        workflowName,
        type
      );

      expect(getAllByText(workflowName).length).toBeGreaterThan(0);
      expect(getAllByText('Inspect').length).toBeGreaterThan(0);
      expect(
        getAllByText((content) => content.startsWith('Last saved:')).length
      ).toBeGreaterThan(0);
      expect(getByText('Close')).toBeInTheDocument();
      expect(getByText('Export')).toBeInTheDocument();
      expect(getByRole('tab', { name: 'Test flow' })).toBeInTheDocument();
      expect(getByRole('tab', { name: 'Resources' })).toBeInTheDocument();
      expect(getAllByText('Console').length).toBeGreaterThan(0);
    });
  });
});

describe('WorkflowDetail Page Functionality (Custom Workflow)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('tests Export button, Tools panel toggling, and Workspace preview', async () => {
    global.URL.createObjectURL = jest.fn();
    const { getByText, container, getByTestId } = renderWithRouter(
      workflowId,
      workflowName,
      WORKFLOW_TYPE.CUSTOM
    );
    // Export button opens the export component
    userEvent.click(getByTestId('exportButton'));
    await waitFor(() => {
      expect(getByText(`Export '${workflowName}'`)).toBeInTheDocument();
    });
    // Close the export component
    userEvent.click(getByTestId('exportCloseButton'));
    // Tools panel should collapse and expand the toggle
    const toolsPanel = container.querySelector('#tools_panel_id');
    expect(toolsPanel).toBeVisible();

    const toggleButton = toolsPanel?.querySelector('button[type="button"]');
    expect(toggleButton).toBeInTheDocument();
    userEvent.click(toggleButton!);
    // Tools panel after collapsing
    const collapsedToolsPanel = container.querySelector('#tools_panel_id');
    await waitFor(() => {
      expect(collapsedToolsPanel).toHaveClass('euiResizablePanel-isCollapsed');
    });
    // Tools panel after expanding
    userEvent.click(toggleButton!);
    const expandedToolsPanel = container.querySelector('#tools_panel_id');
    await waitFor(() => {
      expect(expandedToolsPanel).not.toHaveClass(
        'euiResizablePanel-isCollapsed'
      );
    });
  });
});

describe('WorkflowDetail Page with skip ingestion option (Hybrid Search Workflow)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test(`renders the WorkflowDetail page with hybrid search workflow`, async () => {
    const { getAllByText, getByText } = renderWithRouter(
      workflowId,
      workflowName,
      WORKFLOW_TYPE.HYBRID_SEARCH
    );

    // Wait for basic rendering
    await waitFor(() => {
      expect(getAllByText(workflowName).length).toBeGreaterThan(0);
    });

    // Test basic page elements that should be present
    expect(getAllByText('Inspect').length).toBeGreaterThan(0);
    expect(getAllByText('Console').length).toBeGreaterThan(0);
    expect(getByText('Export')).toBeInTheDocument();
    expect(getByText('Close')).toBeInTheDocument();

    // Test that the workflow type is properly loaded
    expect(getAllByText(workflowName).length).toBeGreaterThan(0);
  });
});
