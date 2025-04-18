/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiResizableContainer,
  EuiText,
  EuiPanel,
} from '@elastic/eui';
import {
  CONFIG_STEP,
  CachedFormikState,
  INSPECTOR_TAB_ID,
  Workflow,
  WorkflowConfig,
  customStringify,
} from '../../../common';
import {
  isValidUiWorkflow,
  reduceToTemplate,
  USE_NEW_HOME_PAGE,
} from '../../utils';
import { WorkflowInputs } from './workflow_inputs';
import { Workspace } from './workspace';
import { Tools } from './tools';

// styling
import './workspace/workspace-styles.scss';
import '../../global-styles.scss';

interface ResizableWorkspaceProps {
  workflow: Workflow | undefined;
  uiConfig: WorkflowConfig | undefined;
  setUiConfig: (uiConfig: WorkflowConfig) => void;
  ingestDocs: string;
  setIngestDocs: (docs: string) => void;
  isRunningIngest: boolean;
  setIsRunningIngest: (isRunningIngest: boolean) => void;
  isRunningSearch: boolean;
  setIsRunningSearch: (isRunningSearch: boolean) => void;
  selectedStep: CONFIG_STEP;
  setSelectedStep: (step: CONFIG_STEP) => void;
  setUnsavedIngestProcessors: (unsavedIngestProcessors: boolean) => void;
  setUnsavedSearchProcessors: (unsavedSearchProcessors: boolean) => void;
  setCachedFormikState: (cachedFormikState: CachedFormikState) => void;
}

const WORKFLOW_INPUTS_PANEL_ID = 'workflow_inputs_panel_id';
const PREVIEW_PANEL_ID = 'preview_panel_id';
const TOOLS_PANEL_ID = 'tools_panel_id';

/**
 * The overall workspace component that maintains state related to the 2 resizable
 * panels - the ReactFlow workspace panel and the selected component details panel.
 */
export function ResizableWorkspace(props: ResizableWorkspaceProps) {
  // Preview side panel state. This panel encapsulates the tools panel as a child resizable panel.
  const [isPreviewPanelOpen, setIsPreviewPanelOpen] = useState<boolean>(true);
  const [consoleContent, setConsoleContent] = useState<React.ReactNode>(null);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState<boolean>(false);
  const collapseFnHorizontal = useRef(
    (id: string, options: { direction: 'left' | 'right' }) => {}
  );
  const onTogglePreviewChange = () => {
    collapseFnHorizontal.current(PREVIEW_PANEL_ID, {
      direction: 'right',
    });
    setIsPreviewPanelOpen(!isPreviewPanelOpen);
  };

  // Tools side panel state
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState<boolean>(true);
  const collapseFnVertical = useRef(
    (id: string, options: { direction: 'top' | 'bottom' }) => {}
  );
  const onToggleToolsChange = () => {
    collapseFnVertical.current(TOOLS_PANEL_ID, { direction: 'bottom' });
    setIsToolsPanelOpen(!isToolsPanelOpen);
  };

  // Inspector panel state vars. Actions taken in the form can update the Inspector panel,
  // hence we keep top-level vars here to pass to both form and inspector components.
  const [ingestResponse, setIngestResponse] = useState<string>('');
  const [selectedInspectorTabId, setSelectedInspectorTabId] = useState<
    INSPECTOR_TAB_ID
  >(INSPECTOR_TAB_ID.TEST);

  // is valid workflow state, + associated hook to set it as such
  const [isValidWorkflow, setIsValidWorkflow] = useState<boolean>(true);
  useEffect(() => {
    const missingUiFlow = props.workflow && !isValidUiWorkflow(props.workflow);
    if (missingUiFlow) {
      setIsValidWorkflow(false);
    }
  }, [props.workflow]);

  return isValidWorkflow ? (
    <EuiFlexGroup
      direction="column"
      className="stretch-absolute"
      gutterSize="none"
      style={{ height: '100%' }}
    >
      <EuiFlexItem style={{ marginBottom: 0 }}>
        <EuiResizableContainer
          direction="horizontal"
          style={{
            marginTop: USE_NEW_HOME_PAGE ? '0' : '58px',
            height: USE_NEW_HOME_PAGE
              ? 'calc(100% - 50px)'
              : 'calc(100% - 108px)',
            gap: '0px',
          }}
        >
          {(EuiResizablePanel, EuiResizableButton, { togglePanel }) => {
            if (togglePanel) {
              collapseFnHorizontal.current = (panelId: string, { direction }) =>
                togglePanel(panelId, { direction });
            }
            return (
              <>
                <EuiResizablePanel
                  id={WORKFLOW_INPUTS_PANEL_ID}
                  mode="main"
                  initialSize={60}
                  minSize="25%"
                  paddingSize="none"
                  scrollable={false}
                >
                  <WorkflowInputs
                    setConsoleContent={setConsoleContent}
                    isConsoleExpanded={isConsoleExpanded}
                    setIsConsoleExpanded={setIsConsoleExpanded}
                    hideConsole={true}
                    workflow={props.workflow}
                    uiConfig={props.uiConfig}
                    setUiConfig={props.setUiConfig}
                    ingestResponse={ingestResponse}
                    setIngestResponse={setIngestResponse}
                    ingestDocs={props.ingestDocs}
                    setIngestDocs={props.setIngestDocs}
                    isRunningIngest={props.isRunningIngest}
                    setIsRunningIngest={props.setIsRunningIngest}
                    isRunningSearch={props.isRunningSearch}
                    setIsRunningSearch={props.setIsRunningSearch}
                    selectedStep={props.selectedStep}
                    setSelectedStep={props.setSelectedStep}
                    setUnsavedIngestProcessors={
                      props.setUnsavedIngestProcessors
                    }
                    setUnsavedSearchProcessors={
                      props.setUnsavedSearchProcessors
                    }
                    displaySearchPanel={() => {
                      if (!isToolsPanelOpen) {
                        onToggleToolsChange();
                      }
                      setSelectedInspectorTabId(INSPECTOR_TAB_ID.TEST);
                    }}
                    setCachedFormikState={props.setCachedFormikState}
                    context={
                      props.selectedStep === CONFIG_STEP.INGEST
                        ? 'INGEST'
                        : 'SEARCH'
                    }
                  />
                </EuiResizablePanel>
                <EuiResizableButton />
                <EuiResizablePanel
                  id={PREVIEW_PANEL_ID}
                  mode="collapsible"
                  initialSize={60}
                  minSize="25%"
                  paddingSize="none"
                  borderRadius="l"
                  onToggleCollapsedInternal={() => onTogglePreviewChange()}
                >
                  <EuiResizableContainer
                    className="workspace-panel"
                    direction="vertical"
                    style={{
                      gap: '4px',
                    }}
                  >
                    {(
                      EuiResizablePanel,
                      EuiResizableButton,
                      { togglePanel }
                    ) => {
                      if (togglePanel) {
                        collapseFnVertical.current = (
                          panelId: string,
                          { direction }
                        ) =>
                          // ignore is added since docs are incorrectly missing "top" and "bottom"
                          // as valid direction options for vertically-configured resizable panels.
                          // @ts-ignore
                          togglePanel(panelId, { direction });
                      }
                      return (
                        <>
                          <EuiResizablePanel
                            mode="main"
                            initialSize={60}
                            minSize="25%"
                            paddingSize="none"
                            borderRadius="l"
                          >
                            <EuiFlexGroup
                              direction="column"
                              gutterSize="none"
                              style={{ height: '100%' }}
                            >
                              <EuiFlexItem>
                                <Workspace
                                  workflow={props.workflow}
                                  uiConfig={props.uiConfig}
                                />
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          </EuiResizablePanel>
                          <EuiResizableButton />
                          <EuiResizablePanel
                            id={TOOLS_PANEL_ID}
                            mode="collapsible"
                            initialSize={50}
                            minSize="25%"
                            paddingSize="none"
                            borderRadius="l"
                            onToggleCollapsedInternal={() =>
                              onToggleToolsChange()
                            }
                          >
                            <Tools
                              workflow={props.workflow}
                              ingestResponse={ingestResponse}
                              selectedTabId={selectedInspectorTabId}
                              setSelectedTabId={setSelectedInspectorTabId}
                              selectedStep={props.selectedStep}
                              hideIngestResponseTab={true}
                              hideErrorsTab={true}
                            />
                          </EuiResizablePanel>
                        </>
                      );
                    }}
                  </EuiResizableContainer>
                </EuiResizablePanel>
              </>
            );
          }}
        </EuiResizableContainer>
      </EuiFlexItem>

      {/* Console section that spans across the entire width */}
      <EuiFlexItem
        grow={false}
        style={{
          height: 'auto',
          maxHeight: '40px',
          padding: '0',
          marginTop: '2px',
          position: 'absolute',
          bottom: 0,
          left: '0',
          right: '0',
          transition: 'max-height 0.3s ease-in-out',
          ...(isConsoleExpanded && { maxHeight: '250px' }),
        }}
      >
        <EuiPanel
          paddingSize="s"
          style={{
            height: '100%',
            borderRadius: '0',
            margin: '0',
            boxShadow: 'none',
          }}
        >
          {consoleContent}
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={3}>
        <EuiEmptyPrompt
          iconType={'cross'}
          title={<h2>Unable to view workflow details</h2>}
          titleSize="s"
          body={
            <>
              <EuiText size="s">
                Only valid workflows created from this OpenSearch Dashboards
                application are editable and viewable.
              </EuiText>
            </>
          }
        />
      </EuiFlexItem>
      <EuiFlexItem grow={7}>
        <EuiCodeBlock language="json" fontSize="m" isCopyable={false}>
          {customStringify(reduceToTemplate(props.workflow as Workflow))}
        </EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
