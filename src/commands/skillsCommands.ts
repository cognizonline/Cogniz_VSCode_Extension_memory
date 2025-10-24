import * as vscode from "vscode";
import { SkillsClient, type Skill } from "../services/skillsClient";

/**
 * Optimize selected memories using memory-optimizer skill
 */
export async function optimizeMemories(skillsClient: SkillsClient): Promise<void> {
  const editor = vscode.window.activeTextEditor;

  const input = editor?.document.getText(editor.selection) ||
                "Optimize all memories in current project";

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Optimizing memories...",
      cancellable: false,
    },
    async () => {
      try {
        const result = await skillsClient.executeSkill("memory-optimizer", {
          input,
          context: {
            editor_file: editor?.document.fileName,
            workspace: vscode.workspace.name,
          },
        });

        if (result.success) {
          const channel = vscode.window.createOutputChannel("Cogniz Skills");
          channel.clear();
          channel.appendLine("=== Memory Optimization Results ===");
          channel.appendLine(result.output);
          channel.appendLine("");
          if (result.metadata) {
            channel.appendLine(`Execution time: ${result.metadata.execution_time_ms}ms`);
            if (result.metadata.tokens_used) {
              channel.appendLine(`Tokens used: ${result.metadata.tokens_used}`);
            }
          }
          channel.show();

          vscode.window.showInformationMessage(
            "✅ Memory optimization complete! Check Output panel."
          );
        } else {
          vscode.window.showErrorMessage(
            `Optimization failed: ${result.error}`
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to optimize: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );
}

/**
 * Generate API documentation from current file/workspace
 */
export async function generateApiDocs(skillsClient: SkillsClient): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    vscode.window.showErrorMessage("No workspace folder open");
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Generating API documentation...",
      cancellable: false,
    },
    async () => {
      try {
        const result = await skillsClient.executeSkill("api-doc-generator", {
          input: `Generate API documentation for ${workspaceFolder.uri.fsPath}`,
          context: {
            workspace_path: workspaceFolder.uri.fsPath,
            workspace_name: vscode.workspace.name,
          },
        });

        if (result.success) {
          const doc = await vscode.workspace.openTextDocument({
            content: result.output,
            language: "markdown",
          });
          await vscode.window.showTextDocument(doc);

          vscode.window.showInformationMessage(
            "✅ API documentation generated!"
          );
        } else {
          vscode.window.showErrorMessage(
            `Documentation generation failed: ${result.error}`
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to generate docs: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );
}

/**
 * Generate usage analytics report
 */
export async function generateUsageReport(skillsClient: SkillsClient): Promise<void> {
  const period = await vscode.window.showQuickPick(
    ["Last 7 days", "Last 30 days", "Last quarter", "Last year"],
    {
      placeHolder: "Select time period for analytics",
    }
  );

  if (!period) {
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Generating usage report...",
      cancellable: false,
    },
    async () => {
      try {
        const result = await skillsClient.executeSkill("usage-analytics", {
          input: `Generate usage report for ${period.toLowerCase()}`,
          context: {
            period,
            workspace: vscode.workspace.name,
          },
        });

        if (result.success) {
          const doc = await vscode.workspace.openTextDocument({
            content: result.output,
            language: "markdown",
          });
          await vscode.window.showTextDocument(doc);

          vscode.window.showInformationMessage(
            "✅ Usage report generated!"
          );
        } else {
          vscode.window.showErrorMessage(
            `Report generation failed: ${result.error}`
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to generate report: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );
}

/**
 * Calculate revenue metrics
 */
export async function calculateRevenue(skillsClient: SkillsClient): Promise<void> {
  const metric = await vscode.window.showQuickPick(
    ["MRR", "ARR", "Churn Rate", "Complete Dashboard"],
    {
      placeHolder: "Select revenue metric to calculate",
    }
  );

  if (!metric) {
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Calculating ${metric}...`,
      cancellable: false,
    },
    async () => {
      try {
        const result = await skillsClient.executeSkill("revenue-calculator", {
          input: `Calculate ${metric}`,
        });

        if (result.success) {
          const doc = await vscode.workspace.openTextDocument({
            content: result.output,
            language: "markdown",
          });
          await vscode.window.showTextDocument(doc);

          vscode.window.showInformationMessage(
            `✅ ${metric} calculated!`
          );
        } else {
          vscode.window.showErrorMessage(
            `Calculation failed: ${result.error}`
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to calculate: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );
}

/**
 * Show skills palette - list all available skills
 */
export async function showSkillsPalette(skillsClient: SkillsClient): Promise<void> {
  try {
    const skills = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Loading skills...",
        cancellable: false,
      },
      async () => await skillsClient.listSkills()
    );

    if (skills.length === 0) {
      vscode.window.showInformationMessage(
        "No skills available. Check your plan or configuration."
      );
      return;
    }

    const selected = await vscode.window.showQuickPick(
      skills.map((skill) => ({
        label: `$(star) ${skill.name}`,
        description: skill.description,
        detail: `Category: ${skill.category} | Access: ${skill.access_level}`,
        skill,
      })),
      {
        placeHolder: "Select a skill to execute",
      }
    );

    if (!selected) {
      return;
    }

    const input = await vscode.window.showInputBox({
      prompt: `Input for ${selected.skill.name}`,
      placeHolder: "Enter your request...",
      value: selected.skill.skill_id === "memory-optimizer"
        ? "Optimize all memories"
        : "",
    });

    if (!input) {
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Executing ${selected.skill.name}...`,
        cancellable: false,
      },
      async () => {
        const result = await skillsClient.executeSkill(selected.skill.skill_id, {
          input,
        });

        if (result.success) {
          const doc = await vscode.workspace.openTextDocument({
            content: result.output,
            language: "markdown",
          });
          await vscode.window.showTextDocument(doc);

          vscode.window.showInformationMessage(
            `✅ ${selected.skill.name} executed successfully!`
          );
        } else {
          vscode.window.showErrorMessage(
            `Execution failed: ${result.error}`
          );
        }
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to load skills: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
