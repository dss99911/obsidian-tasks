import { StatusMenu } from '../../../src/ui/Menus/StatusMenu';
import { TaskBuilder } from '../../TestingTools/TaskBuilder';
import type { MenuItem } from '../../__mocks__/obsidian';
import { StatusRegistry } from '../../../src/StatusRegistry';
import { StatusSettings } from '../../../src/Config/StatusSettings';
import { resetSettings, updateSettings } from '../../../src/Config/Settings';
import { StatusConfiguration, StatusType } from '../../../src/StatusConfiguration';
import { Status } from '../../../src/Status';
import type { Task } from '../../../src/Task';

export {};

afterEach(() => {
    resetSettings();
});

function menuToString(menu: StatusMenu) {
    // @ts-expect-error TS2339: Property 'items' does not exist on type 'StatusMenu'.
    const items: MenuItem[] = menu.items;
    return '\n' + items.map((item) => `${item.checked ? 'x' : ' '} ${item.title}`).join('\n');
}

describe('StatusMenu', () => {
    let taskBeingOverwritten: Task | undefined;
    let tasksBeingSaved: Task[] | undefined;

    async function testableTaskSaver(originalTask: Task, newTasks: Task | Task[]) {
        taskBeingOverwritten = originalTask;
        tasksBeingSaved = Array.isArray(newTasks) ? newTasks : [newTasks];
    }

    beforeEach(() => {
        taskBeingOverwritten = undefined;
        tasksBeingSaved = undefined;
    });

    it('should show checkmark against the current task status', () => {
        // Arrange
        const task = new TaskBuilder().status(Status.makeInProgress()).build();
        const statusRegistry = new StatusRegistry();

        // Act
        const menu = new StatusMenu(statusRegistry, task);

        // Assert
        const itemsAsText = menuToString(menu);
        expect(itemsAsText).toMatchInlineSnapshot(`
            "
              Change status to: [ ] Todo
              Change status to: [x] Done
            x Change status to: [/] In Progress
              Change status to: [-] Cancelled"
        `);
    });

    it('should ignore duplicate status symbols in global status settings', () => {
        // Arrange
        const statusSettings = new StatusSettings();
        statusSettings.customStatuses.push(new StatusConfiguration('%', '% 1', '&', false, StatusType.TODO));
        statusSettings.customStatuses.push(new StatusConfiguration('%', '% 2', '&', false, StatusType.TODO));
        updateSettings({
            statusSettings: statusSettings,
        });

        const statusRegistry = new StatusRegistry();
        StatusSettings.applyToStatusRegistry(statusSettings, statusRegistry);

        const task = new TaskBuilder().build();

        // Act
        const menu = new StatusMenu(statusRegistry, task);

        // Assert
        const itemsAsText = menuToString(menu);
        expect(itemsAsText).toMatchInlineSnapshot(`
            "
            x Change status to: [ ] Todo
              Change status to: [x] Done
              Change status to: [/] In Progress
              Change status to: [-] Cancelled
              Change status to: [%] % 1"
        `);
    });

    it('should modify task, if different status selected', () => {
        // Arrange
        const onlyShowCancelled = new StatusRegistry();
        onlyShowCancelled.clearStatuses();
        onlyShowCancelled.add(Status.makeCancelled());

        const task = new TaskBuilder().status(Status.makeTodo()).build();
        const menu = new StatusMenu(onlyShowCancelled, task, testableTaskSaver);

        // Act
        // @ts-expect-error TS2339: Property 'items' does not exist on type 'StatusMenu'.
        const todoItem = menu.items[0];
        todoItem.callback();

        // Assert
        expect(taskBeingOverwritten).not.toBeUndefined();
        expect(Object.is(task, taskBeingOverwritten)).toEqual(true);
        expect(taskBeingOverwritten!.status.symbol).toEqual(' ');

        expect(tasksBeingSaved).not.toBeUndefined();
        expect(tasksBeingSaved!.length).toEqual(1);
        expect(tasksBeingSaved![0].status.symbol).toEqual('-');
    });

    it('should not modify task, if current status selected', () => {
        // Arrange
        const task = new TaskBuilder().build();
        const statusRegistry = new StatusRegistry();

        // Act
        const menu = new StatusMenu(statusRegistry, task, testableTaskSaver);

        // Act
        // @ts-expect-error TS2339: Property 'items' does not exist on type 'StatusMenu'.
        const todoItem = menu.items[0];
        expect(todoItem.title).toEqual('Change status to: [ ] Todo');
        todoItem.callback();

        // Assert
        // testableTaskSaver() should never have been called, so the values
        // it saves should still be undefined:
        expect(taskBeingOverwritten).toBeUndefined();
        expect(tasksBeingSaved).toBeUndefined();
    });
});
