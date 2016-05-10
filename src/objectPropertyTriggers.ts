﻿module SurveyEditor {

    export class SurveyPropertyTriggers extends SurveyPropertyArray {
        private value_: Array<any>;
        public koItems: any;
        koQuestions: any; koPages: any;
        public koSelected: any;
        public availableTriggers: Array<string> = [];
        public onDeleteClick: any;
        public onAddClick: any;
        public onApplyClick: any;
        private triggerClasses: Array<Survey.JsonMetadataClass> = [];

        constructor(public onValueChanged: SurveyPropertyValueChangedCallback) {
            super(onValueChanged);
            var self = this;
            this.koItems = ko.observableArray();
            this.koSelected = ko.observable(null);
            this.koPages = ko.observableArray();
            this.koQuestions = ko.observableArray();
            this.triggerClasses = Survey.JsonObject.metaData.getChildrenClasses("surveytrigger", true);
            this.availableTriggers = this.getAvailableTriggers();
            this.value_ = [];
            this.onDeleteClick = function () { self.koItems.remove(self.koSelected()); }
            this.onAddClick = function (triggerType) { self.addItem(triggerType); }
            this.onApplyClick = function () { self.apply(); };
        }
        public get value(): any { return this.value_; }
        public set value(value: any) {
            if (value == null || !Array.isArray(value)) value = [];
            this.value_ = value;
            var array = [];
            if (this.object) {
                this.koPages(this.getNames((<Survey.Survey>this.object).pages));
                this.koQuestions(this.getNames((<Survey.Survey>this.object).getAllQuestions()));
            }
            var jsonObj = new Survey.JsonObject();
            for (var i = 0; i < value.length; i++) {
                var trigger = Survey.JsonObject.metaData.createClass(value[i].getType());
                jsonObj.toObject(value[i], trigger);
                array.push(new SurveyPropertyTrigger(<Survey.SurveyTrigger>trigger, this.koPages, this.koQuestions));
            }
            this.koItems(array);
            this.koSelected(array.length > 0 ? array[0] : null);
        }
        private apply() {
            this.value_ = [];
            var array = this.koItems();
            for (var i = 0; i < array.length; i++) {
                this.value_.push(array[i].createTrigger());
            }
            if (this.onValueChanged) {
                this.onValueChanged(this.value_);
            }
        }
        private getAvailableTriggers(): Array<string> {
            var result = [];
            for (var i = 0; i < this.triggerClasses.length; i++) {
                result.push(this.triggerClasses[i].name);
            }
            return result;
        }
       private getNames(items: Array<any>): Array<string> {
            var names = [];
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (item["name"]) {
                    names.push(item["name"]);
                }
            }
            return names;
        }
        private addItem(triggerType: string) {
            var trigger = new SurveyPropertyTrigger(Survey.JsonObject.metaData.createClass(triggerType), this.koPages, this.koQuestions);
            this.koItems.push(trigger);
            this.koSelected(trigger);
        }
    }

    export class SurveyPropertyTrigger {
        private operators = ["empty", "notempty", "equal", "notequal", "contains", "noncontains", "greater", "less", "greaterorequal", "lessorequal"];
        private triggerType: string;
        availableOperators = [];
        koName: any; koOperator: any; koValue: any; koType: any;
        koText: any; koIsValid: any; koRequireValue: any;
        public hasQuestions: boolean;
        public pages: SurveyPropertyTriggerObjects;
        public questions: SurveyPropertyTriggerObjects;

        constructor(trigger: Survey.SurveyTrigger, koPages: any, koQuestions: any) {
            this.createOperators();
            this.triggerType = trigger.getType();
            this.koType = ko.observable(this.triggerType);
            this.hasQuestions = this.triggerType == "visibletrigger";
            this.koName = ko.observable(trigger.name);
            this.koOperator = ko.observable(trigger.operator);
            this.koValue = ko.observable(trigger.value);
            this.pages = new SurveyPropertyTriggerObjects(editorLocalization.getString("pe.triggerMakePagesVisible"), koPages(), this.hasQuestions ? trigger.pages : []);
            this.questions = new SurveyPropertyTriggerObjects(editorLocalization.getString("pe.triggerMakeQuestionsVisible"), koQuestions(), this.hasQuestions ? trigger.questions : []);
            var self = this;
            this.koRequireValue = ko.computed(() => { return self.koOperator() != "empty" && self.koOperator() != "notempty"; });
            this.koIsValid = ko.computed(() => { if (self.koName() && (!self.koRequireValue() || self.koValue())) return true; return false; });
            this.koText = ko.computed(() => { self.koName(); self.koOperator(); self.koValue(); return self.getText(); });
        }
        public createTrigger(): Survey.SurveyTrigger {
            var trigger = <Survey.SurveyTrigger>Survey.JsonObject.metaData.createClass(this.triggerType);
            trigger.name = this.koName();
            trigger.operator = this.koOperator();
            trigger.value = this.koValue();
            if (this.hasQuestions) {
                trigger.pages = this.pages.koChoosen();
                trigger.questions = this.questions.koChoosen();
            }
            return trigger;
        }
        private createOperators() {
            for (var i = 0; i < this.operators.length; i++) {
                var name = this.operators[i];
                this.availableOperators.push({ name: name, text: editorLocalization.getString("op." + name) });
            }
        }
        private getText(): string {
            if (!this.koIsValid()) return editorLocalization.getString("pe.triggerNotSet");
            return editorLocalization.getString("pe.triggerRunIf") + " '" + this.koName() + "' " + this.getOperatorText() + this.getValueText();
        }
        private getOperatorText(): string {
            var op = this.koOperator();
            for (var i = 0; i < this.availableOperators.length; i++) {
                if (this.availableOperators[i].name == op) return this.availableOperators[i].text;
            }
            return op;
        }
        private getValueText(): string {
            if (!this.koRequireValue()) return "";
            return " " + this.koValue();
        }
    }
    export class SurveyPropertyTriggerObjects {
        koObjects: any;
        koChoosen: any;
        koSelected: any;
        koChoosenSelected: any;
        public onDeleteClick: any;
        public onAddClick: any;
        constructor(public title: string, allObjects: Array<string>, choosenObjects: Array<string>) {
            this.koChoosen = ko.observableArray(choosenObjects);
            var array = [];
            for (var i = 0; i < allObjects.length; i++) {
                var item = allObjects[i];
                if (choosenObjects.indexOf(item) < 0) {
                    array.push(item);
                }
            }
            this.koObjects = ko.observableArray(array);
            this.koSelected = ko.observable();
            this.koChoosenSelected = ko.observable();
            var self = this;
            this.onDeleteClick = function () { self.deleteItem(); }
            this.onAddClick = function () { self.addItem(); }
        }
        private deleteItem() {
            this.changeItems(this.koChoosenSelected(), this.koChoosen, this.koObjects);
        }
        private addItem() {
            this.changeItems(this.koSelected(), this.koObjects, this.koChoosen);
        }
        private changeItems(item: string, removedFrom: any, addTo: any) {
            removedFrom.remove(item);
            addTo.push(item);
            removedFrom.sort();
            addTo.sort();
        }
    }
}