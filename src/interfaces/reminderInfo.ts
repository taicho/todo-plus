import { ReminderType } from "../modules/internal";

export interface ReminderInfo {
    reminderType: ReminderType;
    reminderStartDate?: number;
    reminderValue?: number;
}