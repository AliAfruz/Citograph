using System;using System.Collections.Generic;using System.Drawing;using System.Linq;using System.Windows.Forms;
namespace Citograph.Word {
 internal class MigrationDialog:Form {
  public string SelectedStyle {get{return ((StyleInfo)styles.SelectedItem).id;}}ComboBox styles;
  public MigrationDialog(Dictionary<string,object> report,List<StyleInfo> available,string selected){
   Text="Citograph · Migrate EndNote document";Size=new Size(860,620);MinimumSize=new Size(700,500);StartPosition=FormStartPosition.CenterParent;Font=new Font("Segoe UI",10);BackColor=Color.White;
   var layout=new TableLayoutPanel{Dock=DockStyle.Fill,Padding=new Padding(24),ColumnCount=1,RowCount=5};layout.RowStyles.Add(new RowStyle(SizeType.Absolute,100));layout.RowStyles.Add(new RowStyle(SizeType.Percent,100));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,75));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,55));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,60));Controls.Add(layout);
   layout.Controls.Add(new Label{Dock=DockStyle.Fill,Text=report["name"]+"\r\n"+report["citations"]+" citation groups · "+report["sources"]+" recoverable sources\r\nCreate a new Word copy with editable Citograph citations and a rebuilt bibliography.",ForeColor=Color.FromArgb(61,43,80)},0,0);
   var list=new ListBox{Dock=DockStyle.Fill,IntegralHeight=false,BorderStyle=BorderStyle.FixedSingle};foreach(var r in Data.Parse<List<Dictionary<string,object>>>(Data.Serialize(report["references"])))list.Items.Add(Data.Text(r,"title")+" · "+Data.Authors(r)+" · "+Data.Year(r));layout.Controls.Add(list,0,1);
   var notices=report.ContainsKey("notices")?Data.Parse<List<string>>(Data.Serialize(report["notices"])):new List<string>();var issues=Data.Parse<List<string>>(Data.Serialize(report["issues"]));var warnings=Data.Parse<List<string>>(Data.Serialize(report["warnings"]));var status=new TextBox{Dock=DockStyle.Fill,Multiline=true,ReadOnly=true,ScrollBars=ScrollBars.Vertical,BackColor=Color.White,BorderStyle=BorderStyle.None,Text=issues.Count>0?string.Join("\r\n",issues):string.Join("\r\n",new[]{"Ready to migrate. The original file is preserved."}.Concat(notices).Concat(warnings))};layout.Controls.Add(status,0,2);
   styles=new ComboBox{Dock=DockStyle.Fill,DropDownStyle=ComboBoxStyle.DropDownList};styles.Items.AddRange(available.Cast<object>().ToArray());styles.SelectedIndex=Math.Max(0,available.FindIndex(s=>s.id==selected));layout.Controls.Add(styles,0,3);
   var buttons=new FlowLayoutPanel{Dock=DockStyle.Fill,FlowDirection=FlowDirection.RightToLeft};var convert=new Button{Text="Create Citograph copy",Width=210,Height=38,DialogResult=DialogResult.OK,Enabled=Convert.ToBoolean(report["canMigrate"])};buttons.Controls.Add(convert);buttons.Controls.Add(new Button{Text="Cancel",Width=100,Height=38,DialogResult=DialogResult.Cancel});layout.Controls.Add(buttons,0,4);AcceptButton=convert;CancelButton=(Button)buttons.Controls[1];
  }
 }
}
