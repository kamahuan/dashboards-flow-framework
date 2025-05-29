/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ReactNode, useEffect, useRef, useState } from 'react';
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
  // The global state for selected component ID.
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

  const collapseFnHorizontal = useRef(
    (id: string, options: { direction: 'left' | 'right' }) => {}
  );

  const onToggleToolsChange = () => {
    collapseFnHorizontal.current(TOOLS_PANEL_ID, { direction: 'right' });
    setIsToolsPanelOpen(!isToolsPanelOpen);
  };

  const onToggleConsoleChange = () => {
    setIsConsolePanelOpen(!isConsolePanelOpen);
  };

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
    if (!isEmpty(ingestResponse) && !isConsolePanelOpen) {
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
      {/* Main workspace */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <EuiResizableContainer
          key={`${leftNavOpen}-${isConsolePanelOpen}`}
          direction="horizontal"
          style={{
            width: '100%',
            height: '100%',
            flex: 1,
            gap: '4px',
          }}
        >
          {(EuiResizablePanel, EuiResizableButton, { togglePanel }) => {
            if (togglePanel) {
              collapseFnHorizontal.current = (panelId: string, { direction }) =>
                togglePanel(panelId, { direction });
            }
            return (
              <>
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
                <EuiResizablePanel
                  id={TOOLS_PANEL_ID}
                  mode="collapsible"
                  initialSize={50}
                  minSize="25%"
                  paddingSize="none"
                  borderRadius="l"
                  onToggleCollapsedInternal={() => onToggleToolsChange()}
                >
                  <Tools
                    workflow={props.workflow}
                    selectedTabId={selectedInspectorTabId}
                    setSelectedTabId={setSelectedInspectorTabId}
                    uiConfig={props.uiConfig}
                  />
                </EuiResizablePanel>
              </>
            );
          }}
        </EuiResizableContainer>
      </div>

      {/* Console panel */}
      <div
        style={{
          height: isConsolePanelOpen ? '300px' : '40px',
          flexShrink: 0,
          borderTop: '1px solid #D3DAE6',
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
