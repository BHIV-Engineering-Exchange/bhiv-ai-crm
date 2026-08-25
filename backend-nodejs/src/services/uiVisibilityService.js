import { NiyantranAdapter } from './niyantranAdapter.js';

/**
 * uiVisibilityService.js — SETU UI Visibility Service (Node.js Edition)
 *
 * READ-ONLY service for aggregating trace timelines, task state visibility,
 * and candidate state summaries for SETU dashboard UIs.
 */

export class UiVisibilityService {
  /**
   * Get candidate execution state for UI visibility
   */
  static async getCandidateState(traceId) {
    const timelineRes = await NiyantranAdapter.getExecutionTimeline(traceId);
    const timeline = timelineRes.timeline || [];

    let currentState = 'unknown';

    if (timeline.length > 0) {
      const latestEvent = timeline[timeline.length - 1];

      if (latestEvent.type === 'task_state') {
        currentState = latestEvent.data.state;
      } else if (latestEvent.type === 'submission_state') {
        currentState = `submission_${latestEvent.data.state}`;
      } else if (latestEvent.type === 'execution_status') {
        currentState = latestEvent.data.status;
      }
    }

    return {
      trace_id: traceId,
      current_state: currentState,
      last_updated: timeline.length > 0 ? timeline[timeline.length - 1].timestamp : null,
      total_events: timeline.length,
    };
  }

  /**
   * Get task states organized for UI visibility
   */
  static async getTaskStateVisibility(traceId) {
    const taskStates = await NiyantranAdapter.getTaskStates(traceId);

    const tasksById = {};
    for (const state of taskStates) {
      const taskId = state.task_id;
      if (!tasksById[taskId]) {
        tasksById[taskId] = [];
      }
      tasksById[taskId].push(state);
    }

    const taskSummaries = Object.keys(tasksById).map(taskId => {
      const history = tasksById[taskId];
      const latest = history[history.length - 1];
      return {
        task_id: taskId,
        current_state: latest.state,
        last_updated: latest.timestamp,
        history_count: history.length,
      };
    });

    return {
      trace_id: traceId,
      tasks: taskSummaries,
      total_tasks: taskSummaries.length,
    };
  }

  /**
   * Get full trace timeline
   */
  static async getTraceTimeline(traceId) {
    return await NiyantranAdapter.getExecutionTimeline(traceId);
  }
}

export default UiVisibilityService;
