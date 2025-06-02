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

  // Panel refs
  const toolsPanelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const collapseFnHorizontal = useRef<
    (id: string, options: { direction: 'left' | 'right' }) => void
  >(() => {});

  const onToggleToolsChange = useCallback(() => {
    if (typeof collapseFnHorizontal.current === 'function') {
      collapseFnHorizontal.current(TOOLS_PANEL_ID, { direction: 'right' });
    }
    setIsToolsPanelOpen(!isToolsPanelOpen);
  }, [isToolsPanelOpen]);

  const onToggleConsoleChange = useCallback(() => {
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
  // Error display messages and actual error count
  const [consoleErrorMessages, setConsoleErrorMessages] = useState<
    (string | ReactNode)[]
  >([]);
  const [actualErrorCount, setActualErrorCount] = useState<number>(0);

  useEffect(() => {
    if (
      !isEmpty(opensearchError) ||
      !isEmpty(ingestPipelineErrors) ||
      !isEmpty(searchPipelineErrors) ||
      !isEmpty(workflowsError) ||
      props.workflow?.error
    ) {
      const errorMessages = [];
      let errorCount = 0;

      if (!isEmpty(opensearchError)) {
        errorMessages.push(opensearchError);
        errorCount += 1;
      }
      if (!isEmpty(workflowsError)) {
        errorMessages.push(workflowsError);
        errorCount += 1;
      }
      if (props.workflow?.error) {
        errorMessages.push(props.workflow.error);
        errorCount += 1;
      }
      if (!isEmpty(ingestPipelineErrors)) {
        // Add header message (doesn't count as an error)
        errorMessages.push(
          'Data not ingested. Errors found with the following ingest processor(s):'
        );
        // Add actual errors (these count)
        const ingestErrors = Object.values(ingestPipelineErrors).map((error) =>
          formatProcessorError(error)
        );
        errorMessages.push(...ingestErrors);
        errorCount += ingestErrors.length;
      }
      if (!isEmpty(searchPipelineErrors)) {
        // Add header message (doesn't count as an error)
        errorMessages.push(
          'Errors found with the following search processor(s):'
        );
        // Add actual errors (these count)
        const searchErrors = Object.values(searchPipelineErrors).map((error) =>
          formatProcessorError(error)
        );
        errorMessages.push(...searchErrors);
        errorCount += searchErrors.length;
      }

      setConsoleErrorMessages(errorMessages);
      setActualErrorCount(errorCount);

      // Auto-open console when errors are present
      setIsConsolePanelOpen(true);
    } else {
      setConsoleErrorMessages([]);
      setActualErrorCount(0);
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
      // Auto-open console when there's an ingest response
      setIsConsolePanelOpen(true);
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
            // CRITICAL FIX: Ensure container respects viewport width
            maxWidth: '100vw',
            overflow: 'hidden',
          }}
        >
          {(EuiResizablePanel, EuiResizableButton, { togglePanel }) => {
            // Store the togglePanel function for the collapse functionality
            if (togglePanel) {
              collapseFnHorizontal.current = togglePanel;
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
                        if (!isToolsPanelOpen) {
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

                {/* Middle panel - Slightly wider initial size */}
                <EuiResizablePanel
                  id={WORKFLOW_INPUTS_PANEL_ID}
                  mode="main"
                  initialSize={60}
                  minSize="30%"
                  paddingSize="none"
                  scrollable={false}
                  style={{
                    maxWidth: 'calc(100vw - 350px)', // Leave at least 350px for tools panel
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: '100%',
                      overflow: 'auto', // CRITICAL FIX: Allow scrolling instead of expansion
                      maxWidth: '100%', // CRITICAL FIX: Prevent horizontal overflow
                    }}
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
                  </div>
                </EuiResizablePanel>

                <EuiResizableButton />

                {/* Right panel - Adjusted for wider middle panel */}
                <EuiResizablePanel
                  id={TOOLS_PANEL_ID}
                  mode="collapsible"
                  initialSize={40}
                  minSize="300px"
                  paddingSize="none"
                  borderRadius="l"
                  onToggleCollapsedInternal={() => {
                    onToggleToolsChange();
                  }}
                  style={{
                    minWidth: '300px',
                    flexShrink: 0,
                    flexGrow: 0,
                    flexBasis: 'auto',
                  }}
                >
                  <div
                    ref={toolsPanelRef}
                    style={{
                      height: '100%',
                      overflow: 'auto',
                      minWidth: '300px',
                    }}
                  >
                    <Tools
                      workflow={props.workflow}
                      selectedTabId={selectedInspectorTabId}
                      setSelectedTabId={setSelectedInspectorTabId}
                      uiConfig={props.uiConfig}
                    />
                  </div>
                </EuiResizablePanel>
              </>
            );
          }}
        </EuiResizableContainer>
      </div>

      {/* Console panel - unchanged */}
      <div
        style={{
          height: isConsolePanelOpen ? '300px' : '40px',
          flexShrink: 0,
          borderTop: '1px solid #D3DAE6',
          transition: 'height 0.2s ease',
        }}
      >
        <EuiPanel
          paddingSize="s"
          style={{
            height: '100%',
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
                  errorCount={actualErrorCount}
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
