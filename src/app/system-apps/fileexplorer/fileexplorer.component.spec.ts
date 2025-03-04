import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileExplorerComponent } from './fileexplorer.component';

describe('FileExplorerComponent', () => {
	let component: FileExplorerComponent;
	let fixture: ComponentFixture<FileExplorerComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [FileExplorerComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(FileExplorerComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
