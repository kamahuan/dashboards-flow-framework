/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  ReactNode,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiResizableContainer,
  EuiSmallButtonIcon,
  EuiText,
} from '@elastic/eui';
import {
  CachedFormikState,
  INSPECTOR_TAB_ID,
  Workflow,
  WorkflowConfig,
  customStringify,
} from '../../../common';
import {
  formatProcessorError,
  isValidUiWorkflow,
  reduceToTemplate,
} from '../../utils';
import { ComponentInput } from './component_input';
import { Tools } from './tools';
import { LeftNav } from './left_nav';
import { AppState } from '../../store';
import { Console } from './tools/console';

// styling
import './workspace/workspace-styles.scss';
import '../../global-styles.scss';
import { useSelector } from 'react-redux';
import { isEmpty } from 'lodash';

interface ResizableWorkspaceProps {
  workflow: Workflow | undefined;
  uiConfig: WorkflowConfig | undefined;
  setUiConfig: (uiConfig: WorkflowConfig) => void;
  ingestDocs: string;
  setIngestDocs: (docs: string) => void;
  setBlockNavigation: (blockNavigation: boolean) => void;
  setCachedFormikState: (cachedFormikState: CachedFormikState) => void;
}

const WORKFLOW_INPUTS_PANEL_ID = 'workflow_inputs_panel_id';
const TOOLS_PANEL_ID = 'tools_panel_id';

/**
 * The overall workspace component that maintains state related to the 2 resizable
 * panels - the ReactFlow workspace panel and the selected component details panel.
 */
export function ResizableWorkspace(props: ResizableWorkspaceProps) {
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState<boolean>(true);
  const [isConsolePanelOpen, setIsConsolePanelOpen] = useState<boolean>(false);
  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [leftNavOpen, setLeftNavOpen] = useState<boolean>(true);

  // misc ingest-related state required to be shared across the left nav
  // and ingest-related components
  const [lastIngested, setLastIngested] = useState<number | undefined>(
    undefined
  );
  const [ingestUpdateRequired, setIngestUpdateRequired] = useState<boolean>(
    false
  );

  // Readonly states for ingest and search. If there are unsaved changes in one context, block editing in the other.
  const [ingestReadonly, setIngestReadonly] = useState<boolean>(false);
  const [searchReadonly, setSearchReadonly] = useState<boolean>(false);
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  const onIngest = selectedComponentId.startsWith('ingest');
  const onSearch = selectedComponentId.startsWith('search');

  // Add debugging refs and effects
  const toolsPanelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track when isToolsPanelOpen changes and why
  const prevToolsPanelOpen = useRef(isToolsPanelOpen);
  useEffect(() => {
    if (prevToolsPanelOpen.current !== isToolsPanelOpen) {
      console.log(
        `🔍 TOOLS PANEL STATE CHANGED: ${prevToolsPanelOpen.current} → ${isToolsPanelOpen}`
      );
      console.log('Stack trace:', new Error().stack);
      prevToolsPanelOpen.current = isToolsPanelOpen;
    }
  }, [isToolsPanelOpen]);

  // Monitor the actual DOM element
  useEffect(() => {
    const interval = setInterval(() => {
      const toolsPanel = document.getElementById(TOOLS_PANEL_ID);
      if (toolsPanel) {
        const computedStyle = window.getComputedStyle(toolsPanel);
        const width = computedStyle.width;
        const display = computedStyle.display;
        const visibility = computedStyle.visibility;

        console.log(
          `🔍 DOM CHECK - Tools panel: width=${width}, display=${display}, visibility=${visibility}, collapsed=${toolsPanel.getAttribute(
            'data-collapsed'
          )}`
        );

        // Check if panel is effectively hidden
        if (width === '0px' || display === 'none' || visibility === 'hidden') {
          console.log('❌ TOOLS PANEL IS HIDDEN IN DOM!');
        }
      } else {
        console.log('❌ TOOLS PANEL NOT FOUND IN DOM!');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const collapseFnHorizontal = useRef<
    (id: string, options: { direction: 'left' | 'right' }) => void
  >(() => {});

  const onToggleToolsChange = useCallback(() => {
    console.log(
      '🔧 onToggleToolsChange called, current state:',
      isToolsPanelOpen
    );
    console.log('🔧 Stack trace:', new Error().stack);

    // Check if collapseFnHorizontal is actually available
    if (typeof collapseFnHorizontal.current === 'function') {
      console.log('🔧 Calling collapseFnHorizontal.current');
      collapseFnHorizontal.current(TOOLS_PANEL_ID, { direction: 'right' });
    } else {
      console.log('❌ collapseFnHorizontal.current is not a function!');
    }

    setIsToolsPanelOpen(!isToolsPanelOpen);
  }, [isToolsPanelOpen]);

  const onToggleConsoleChange = useCallback(() => {
    console.log(
      '🔧 onToggleConsoleChange called, current state:',
      isConsolePanelOpen
    );
    setIsConsolePanelOpen(!isConsolePanelOpen);
  }, [isConsolePanelOpen]);

  // Inspector panel state vars. Actions taken in the form can update the Inspector panel,
  // hence we keep top-level vars here to pass to both form and inspector components.
  const [ingestResponse, setIngestResponse] = useState<string>('');
  const [selectedInspectorTabId, setSelectedInspectorTabId] = useState<
    INSPECTOR_TAB_ID
  >(INSPECTOR_TAB_ID.TEST);

  const { opensearch, workflows } = useSelector((state: AppState) => state);
  const opensearchError = opensearch.errorMessage;
  const workflowsError = workflows.errorMessage;
  const {
    ingestPipeline: ingestPipelineErrors,
    searchPipeline: searchPipelineErrors,
  } = useSelector((state: AppState) => state.errors);
  const [consoleErrorMessages, setConsoleErrorMessages] = useState<
    (string | ReactNode)[]
  >([]);

  useEffect(() => {
    console.log('Error useEffect triggered');
    if (
      !isEmpty(opensearchError) ||
      !isEmpty(ingestPipelineErrors) ||
      !isEmpty(searchPipelineErrors) ||
      !isEmpty(workflowsError) ||
      props.workflow?.error
    ) {
      const errorMessages = [];

      if (!isEmpty(opensearchError)) {
        errorMessages.push(opensearchError);
      }
      if (!isEmpty(workflowsError)) {
        errorMessages.push(workflowsError);
      }
      if (props.workflow?.error) {
        errorMessages.push(props.workflow.error);
      }
      if (!isEmpty(ingestPipelineErrors)) {
        errorMessages.push(
          'Data not ingested. Errors found with the following ingest processor(s):'
        );
        errorMessages.push(
          ...Object.values(ingestPipelineErrors).map((error) =>
            formatProcessorError(error)
          )
        );
      }
      if (!isEmpty(searchPipelineErrors)) {
        errorMessages.push(
          'Errors found with the following search processor(s):'
        );
        errorMessages.push(
          ...Object.values(searchPipelineErrors).map((error) =>
            formatProcessorError(error)
          )
        );
      }

      setConsoleErrorMessages(errorMessages);

      if (!isConsolePanelOpen) {
        console.log('Auto-opening console due to errors');
        setIsConsolePanelOpen(true);
      }
    } else {
      setConsoleErrorMessages([]);
    }
  }, [
    opensearchError,
    workflowsError,
    ingestPipelineErrors,
    searchPipelineErrors,
    props.workflow?.error,
  ]);

  useEffect(() => {
    if (!isEmpty(ingestResponse)) {
      console.log('Auto-opening console due to ingest response');
      if (!isConsolePanelOpen) {
        setIsConsolePanelOpen(true);
      }
    }
  }, [ingestResponse]);

  // is valid workflow state, + associated hook to set it as such
  const [isValidWorkflow, setIsValidWorkflow] = useState<boolean>(true);
  useEffect(() => {
    const missingUiFlow = props.workflow && !isValidUiWorkflow(props.workflow);
    if (missingUiFlow) {
      setIsValidWorkflow(false);
    }
  }, [props.workflow]);

  return isValidWorkflow ? (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Main workspace - takes remaining space */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <EuiResizableContainer
          key="debug-static-key"
          direction="horizontal"
          style={{
            width: '100%',
            height: '100%',
            gap: '4px',
          }}
        >
          {(EuiResizablePanel, EuiResizableButton, { togglePanel }) => {
            console.log(
              '🔍 ResizableContainer render - togglePanel available:',
              !!togglePanel
            );

            // Track when togglePanel changes
            if (togglePanel) {
              const wrappedTogglePanel = (panelId: string, options: any) => {
                console.log('🔧 TOGGLE PANEL CALLED:', panelId, options);
                console.log('🔧 Stack trace:', new Error().stack);

                // Check the panel state before and after
                const beforeElement = document.getElementById(panelId);
                if (beforeElement) {
                  console.log(
                    '🔍 Before toggle - width:',
                    window.getComputedStyle(beforeElement).width
                  );
                }

                const result = togglePanel(panelId, options);

                setTimeout(() => {
                  const afterElement = document.getElementById(panelId);
                  if (afterElement) {
                    console.log(
                      '🔍 After toggle - width:',
                      window.getComputedStyle(afterElement).width
                    );
                  }
                }, 100);

                return result;
              };

              collapseFnHorizontal.current = wrappedTogglePanel;
            }

            return (
              <>
                {/* Left panel */}
                <div
                  className={leftNavOpen ? 'left-nav-static-width' : undefined}
                >
                  {leftNavOpen ? (
                    <LeftNav
                      workflow={props.workflow}
                      uiConfig={props.uiConfig}
                      setUiConfig={props.setUiConfig}
                      setIngestResponse={setIngestResponse}
                      ingestDocs={props.ingestDocs}
                      setIngestDocs={props.setIngestDocs}
                      setIngestUpdateRequired={setIngestUpdateRequired}
                      setBlockNavigation={props.setBlockNavigation}
                      displaySearchPanel={() => {
                        console.log(
                          '🔍 displaySearchPanel called! isToolsPanelOpen:',
                          isToolsPanelOpen
                        );
                        if (!isToolsPanelOpen) {
                          console.log(
                            '🔧 About to call onToggleToolsChange from displaySearchPanel'
                          );
                          onToggleToolsChange();
                        }
                        setSelectedInspectorTabId(INSPECTOR_TAB_ID.TEST);
                      }}
                      setCachedFormikState={props.setCachedFormikState}
                      setLastIngested={setLastIngested}
                      selectedComponentId={selectedComponentId}
                      setSelectedComponentId={setSelectedComponentId}
                      setIngestReadonly={setIngestReadonly}
                      setSearchReadonly={setSearchReadonly}
                      setIsProvisioning={setIsProvisioning}
                      onClose={() => setLeftNavOpen(false)}
                    />
                  ) : undefined}
                </div>

                {/* Middle panel */}
                <EuiResizablePanel
                  id={WORKFLOW_INPUTS_PANEL_ID}
                  mode="main"
                  initialSize={50}
                  minSize="25%"
                  paddingSize="none"
                  scrollable={false}
                >
                  <ComponentInput
                    selectedComponentId={selectedComponentId}
                    workflow={props.workflow}
                    uiConfig={props.uiConfig as WorkflowConfig}
                    setUiConfig={props.setUiConfig}
                    setIngestDocs={props.setIngestDocs}
                    lastIngested={lastIngested}
                    ingestUpdateRequired={ingestUpdateRequired}
                    readonly={
                      (onIngest && ingestReadonly) ||
                      (onSearch && searchReadonly) ||
                      isProvisioning
                    }
                    leftNavOpen={leftNavOpen}
                    openLeftNav={() => setLeftNavOpen(true)}
                  />
                </EuiResizablePanel>

                <EuiResizableButton />

                {/* Right panel - ADD DEBUGGING */}
                <EuiResizablePanel
                  id={TOOLS_PANEL_ID}
                  mode="collapsible"
                  initialSize={50}
                  minSize="25%"
                  paddingSize="none"
                  borderRadius="l"
                  onToggleCollapsedInternal={() => {
                    console.log(
                      '🔧 Tools panel onToggleCollapsedInternal called'
                    );
                    console.log('🔧 Stack trace:', new Error().stack);
                    onToggleToolsChange();
                  }}
                >
                  <div
                    ref={toolsPanelRef}
                    style={{
                      border: '3px solid red',
                      minHeight: '200px',
                      backgroundColor: 'rgba(255, 0, 0, 0.1)',
                      padding: '20px',
                    }}
                  >
                    <h3>TOOLS PANEL DEBUG</h3>
                    <p>State: {isToolsPanelOpen ? 'OPEN' : 'CLOSED'}</p>
                    <p>Time: {new Date().toLocaleTimeString()}</p>
                    <p>Selected Component: {selectedComponentId}</p>
                    <p>
                      Console Panel: {isConsolePanelOpen ? 'OPEN' : 'CLOSED'}
                    </p>

                    {/* Temporarily replace Tools component with this debug content */}
                    <div
                      style={{
                        marginTop: '20px',
                        padding: '10px',
                        border: '1px solid blue',
                      }}
                    >
                      <h4>Original Tools Component Location</h4>
                      <p>
                        This is where the Tools component would be rendered.
                      </p>
                      <p>
                        If you can see this red box, the panel structure is
                        working.
                      </p>
                    </div>

                    {/* Uncomment this to test with the real Tools component */}
                    {/* <Tools
                      workflow={props.workflow}
                      selectedTabId={selectedInspectorTabId}
                      setSelectedTabId={setSelectedInspectorTabId}
                      uiConfig={props.uiConfig}
                    /> */}
                  </div>
                </EuiResizablePanel>
              </>
            );
          }}
        </EuiResizableContainer>
      </div>

      {/* Console panel with debugging */}
      <div
        style={{
          height: isConsolePanelOpen ? '300px' : '40px',
          flexShrink: 0,
          borderTop: '1px solid #D3DAE6',
          transition: 'height 0.2s ease',
          backgroundColor: 'rgba(0, 255, 0, 0.1)', // Green for debugging
          border: '2px solid green',
        }}
      >
        <div style={{ padding: '8px' }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>
            🐛 DEBUG INFO: Console: {isConsolePanelOpen ? 'OPEN' : 'CLOSED'} |
            Tools Panel State: {isToolsPanelOpen ? 'OPEN' : 'CLOSED'}
          </p>
        </div>

        <EuiPanel
          paddingSize="s"
          style={{
            height: 'calc(100% - 40px)',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 0,
            borderTop: 'none',
          }}
        >
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="s"
            responsive={false}
            style={{
              marginBottom: isConsolePanelOpen ? '18px' : '0px',
              maxHeight: '32px',
              flexShrink: 0,
            }}
          >
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>Console</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSmallButtonIcon
                aria-label="Toggle console"
                iconType={isConsolePanelOpen ? 'fold' : 'unfold'}
                onClick={onToggleConsoleChange}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          {isConsolePanelOpen && (
            <EuiFlexItem grow={true} style={{ overflow: 'hidden' }}>
              <div style={{ height: '100%', overflow: 'auto' }}>
                <Console
                  errorMessages={consoleErrorMessages}
                  ingestResponse={ingestResponse}
                />
              </div>
            </EuiFlexItem>
          )}
        </EuiPanel>
      </div>
    </div>
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
