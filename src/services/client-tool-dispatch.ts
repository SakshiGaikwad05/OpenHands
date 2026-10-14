import type { OpenHandsEvent } from "#/types/agent-server/core";
import {
  isLaunchChildConversationActionEvent,
  isRequestSecretActionEvent,
  isUserMessageEvent,
} from "#/types/agent-server/type-guards";
import { handleLaunchChildConversationAction } from "./child-conversation-launch";
import { handleRequestSecretAction } from "./secret-request";

/**
 * Run a client tool call whose work happens in the browser and whose outcome is
 * posted back to the agent. Each handler claims its tool call, so a call seen
 * more than once (live, replayed, or in history) is acted on once.
 */
export function dispatchClientToolCall(
  event: OpenHandsEvent,
  conversationId: string,
): void {
  if (isLaunchChildConversationActionEvent(event)) {
    void handleLaunchChildConversationAction(
      event.action,
      conversationId,
      event.tool_call_id,
    );
  }

  if (isRequestSecretActionEvent(event)) {
    void handleRequestSecretAction(
      event.action,
      conversationId,
      event.tool_call_id,
    );
  }
}

/**
 * Run the client tool calls the agent is still waiting on in a page of history.
 *
 * The agent-server acknowledges a client tool call at once, so a call made
 * while no tab was connected reaches the browser only through history; left
 * there, the agent waits for an outcome forever. The outcome comes back as a
 * user message, so only calls after the last one can still be unanswered —
 * older calls were answered, or the conversation has moved past them.
 *
 * @param events History in chronological (oldest → newest) order.
 */
export function dispatchUnansweredClientToolCalls(
  events: OpenHandsEvent[],
  conversationId: string,
): void {
  let firstUnanswered = 0;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (isUserMessageEvent(events[i])) {
      firstUnanswered = i + 1;
      break;
    }
  }

  for (const event of events.slice(firstUnanswered)) {
    dispatchClientToolCall(event, conversationId);
  }
}
