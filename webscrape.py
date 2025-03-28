import requests
from bs4 import BeautifulSoup
import csv
import re
import time
import pandas as pd
import os

def scrape_ray_of_hope():
    # Categories to scrape
    categories = [
        'children-12-years-and-below', 
        'chronic-illness', 
        'disability', 
        'ex-offenders', 
        'families-in-need', 
        'mental-health', 
        'migrant-workers', 
        'other-marginalised-communities', 
        'seniors', 
        'youth-from-13-to-21-years'
    ]
    
    # Add the giving circles as a special URL
    giving_circles_url = "https://rayofhope.sg/campaigns/4-giving-circles/"
    
    # Headers for request
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    # Store all campaign data (including duplicates)
    all_campaigns = []
    
    # First process regular categories
    for category in categories:
        print(f"Scraping category: {category}")
        
        # Process each page until no more campaigns are found or we hit the max
        page_num = 1
        max_pages = 6
        
        while page_num <= max_pages:
            if page_num == 1:
                url = f"https://rayofhope.sg/product-tag/{category}/"
            else:
                url = f"https://rayofhope.sg/product-tag/{category}/page/{page_num}/"
            
            print(f"Scraping page {page_num}: {url}")
            
            # Send GET request
            try:
                response = requests.get(url, headers=headers, timeout=10)
            except requests.exceptions.RequestException as e:
                print(f"Error accessing {url}: {e}")
                break
            
            # If page doesn't exist, break the loop
            if response.status_code != 200:
                print(f"Page {page_num} not found (Status code: {response.status_code}). Moving to next category.")
                break
            
            # Parse HTML
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Check if no campaigns found using string instead of text (to fix the deprecation warning)
            no_campaigns = soup.find(string=re.compile("No products were found"))
            if no_campaigns:
                print(f"No campaigns found on page {page_num}. Moving to next category.")
                break
            
            # Find all campaign containers - THIS IS THE KEY PART FROM THE ORIGINAL CODE
            campaign_posts = soup.find_all('div', class_='themeum-campaign-post')
            
            if not campaign_posts:
                print(f"No campaign containers found on page {page_num}. Moving to next category.")
                break
            
            # Count campaigns found on this page
            campaigns_found = 0
            
            # Process each campaign post
            for post in campaign_posts:
                # Get the content div which has the title and categories
                content_div = post.find('div', class_='themeum-campaign-post-content')
                if not content_div:
                    continue
                
                # Extract campaign title
                title_element = content_div.find('h3', class_='entry-title')
                if not title_element:
                    continue
                
                title = title_element.text.strip()
                
                # Extract URL for deduplication
                url_element = title_element.find('a')
                if url_element and 'href' in url_element.attrs:
                    campaign_url = url_element['href']
                else:
                    campaign_url = "Unknown"
                
                # Extract days to go
                days_element = post.find('div', class_='roh-days-to-go')
                days_to_go = days_element.text.strip() if days_element else "No days information found"
                
                # Extract amount raised and target amount
                amount_raised = "Unknown"
                target_amount = "Unknown"
                
                # Find the progress bar section
                progress_section = post.find('div', class_='progressbar-content-wrapper')
                if progress_section:
                    # Extract amount raised
                    amount_element = progress_section.find('span', class_='woocommerce-Price-amount')
                    if amount_element:
                        # Use regex to extract the number after S$
                        amount_match = re.search(r'S\$(\d+(?:,\d+)*(?:\.\d+)?)', amount_element.text)
                        if amount_match:
                            amount_raised = amount_match.group(1)
                    
                    # Extract target amount
                    target_element = progress_section.find('div', class_='thm-funding-goal')
                    if target_element:
                        target_amount_element = target_element.find('span', class_='woocommerce-Price-amount')
                        if target_amount_element:
                            target_match = re.search(r'S\$(\d+(?:,\d+)*(?:\.\d+)?)', target_amount_element.text)
                            if target_match:
                                target_amount = target_match.group(1)
                
                # Extract categories
                categories_list = []
                category_element = content_div.find('span', class_='entry-category')
                if category_element:
                    category_links = category_element.find_all('a')
                    categories_list = [link.text.strip() for link in category_links]
                
                # Add current category to the list for tracking purposes
                current_category = category
                
                # Create campaign data dictionary
                campaign_data = {
                    'Title': title,
                    'Days to Go': days_to_go,
                    'Amount Raised': amount_raised,
                    'Target Amount': target_amount,
                    'Categories': ', '.join(categories_list),
                    'URL': campaign_url,
                    'Source Category': current_category  # Track which category this was found in
                }
                
                # Add to the campaigns list
                all_campaigns.append(campaign_data)
                campaigns_found += 1
            
            print(f"Found {campaigns_found} campaigns on page {page_num}")
            
            # Move to next page
            page_num += 1
            
            # Be respectful to the server - add a delay
            time.sleep(0.5)
    
    # Process the giving circles special URL
    print(f"Scraping 4-giving-circles: {giving_circles_url}")
    
    try:
        response = requests.get(giving_circles_url, headers=headers, timeout=10)
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            campaign_posts = soup.find_all('div', class_='themeum-campaign-post')
            
            campaigns_found = 0
            for post in campaign_posts:
                # Similar extraction logic as above
                content_div = post.find('div', class_='themeum-campaign-post-content')
                if not content_div:
                    continue
                
                title_element = content_div.find('h3', class_='entry-title')
                if not title_element:
                    continue
                
                title = title_element.text.strip()
                
                url_element = title_element.find('a')
                if url_element and 'href' in url_element.attrs:
                    campaign_url = url_element['href']
                else:
                    campaign_url = "Unknown"
                
                days_element = post.find('div', class_='roh-days-to-go')
                days_to_go = days_element.text.strip() if days_element else "No days information found"
                
                amount_raised = "Unknown"
                target_amount = "Unknown"
                
                progress_section = post.find('div', class_='progressbar-content-wrapper')
                if progress_section:
                    amount_element = progress_section.find('span', class_='woocommerce-Price-amount')
                    if amount_element:
                        amount_match = re.search(r'S\$(\d+(?:,\d+)*(?:\.\d+)?)', amount_element.text)
                        if amount_match:
                            amount_raised = amount_match.group(1)
                    
                    target_element = progress_section.find('div', class_='thm-funding-goal')
                    if target_element:
                        target_amount_element = target_element.find('span', class_='woocommerce-Price-amount')
                        if target_amount_element:
                            target_match = re.search(r'S\$(\d+(?:,\d+)*(?:\.\d+)?)', target_amount_element.text)
                            if target_match:
                                target_amount = target_match.group(1)
                
                categories_list = []
                category_element = content_div.find('span', class_='entry-category')
                if category_element:
                    category_links = category_element.find_all('a')
                    categories_list = [link.text.strip() for link in category_links]
                
                campaign_data = {
                    'Title': title,
                    'Days to Go': days_to_go,
                    'Amount Raised': amount_raised,
                    'Target Amount': target_amount,
                    'Categories': ', '.join(categories_list),
                    'URL': campaign_url,
                    'Source Category': '4-giving-circles'
                }
                
                all_campaigns.append(campaign_data)
                campaigns_found += 1
            
            print(f"Found {campaigns_found} campaigns in 4-giving-circles")
        else:
            print(f"Failed to access 4-giving-circles (Status code: {response.status_code})")
    except requests.exceptions.RequestException as e:
        print(f"Error accessing 4-giving-circles: {e}")
    
    # Also scrape the main campaigns page
    main_url = "https://rayofhope.sg/campaigns/"
    print(f"Scraping main campaigns page: {main_url}")
    
    try:
        response = requests.get(main_url, headers=headers, timeout=10)
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            campaign_posts = soup.find_all('div', class_='themeum-campaign-post')
            
            campaigns_found = 0
            for post in campaign_posts:
                # Same extraction logic
                content_div = post.find('div', class_='themeum-campaign-post-content')
                if not content_div:
                    continue
                
                title_element = content_div.find('h3', class_='entry-title')
                if not title_element:
                    continue
                
                title = title_element.text.strip()
                
                url_element = title_element.find('a')
                if url_element and 'href' in url_element.attrs:
                    campaign_url = url_element['href']
                else:
                    campaign_url = "Unknown"
                
                days_element = post.find('div', class_='roh-days-to-go')
                days_to_go = days_element.text.strip() if days_element else "No days information found"
                
                amount_raised = "Unknown"
                target_amount = "Unknown"
                
                progress_section = post.find('div', class_='progressbar-content-wrapper')
                if progress_section:
                    amount_element = progress_section.find('span', class_='woocommerce-Price-amount')
                    if amount_element:
                        amount_match = re.search(r'S\$(\d+(?:,\d+)*(?:\.\d+)?)', amount_element.text)
                        if amount_match:
                            amount_raised = amount_match.group(1)
                    
                    target_element = progress_section.find('div', class_='thm-funding-goal')
                    if target_element:
                        target_amount_element = target_element.find('span', class_='woocommerce-Price-amount')
                        if target_amount_element:
                            target_match = re.search(r'S\$(\d+(?:,\d+)*(?:\.\d+)?)', target_amount_element.text)
                            if target_match:
                                target_amount = target_match.group(1)
                
                categories_list = []
                category_element = content_div.find('span', class_='entry-category')
                if category_element:
                    category_links = category_element.find_all('a')
                    categories_list = [link.text.strip() for link in category_links]
                
                campaign_data = {
                    'Title': title,
                    'Days to Go': days_to_go,
                    'Amount Raised': amount_raised,
                    'Target Amount': target_amount,
                    'Categories': ', '.join(categories_list),
                    'URL': campaign_url,
                    'Source Category': 'main_page'
                }
                
                all_campaigns.append(campaign_data)
                campaigns_found += 1
            
            print(f"Found {campaigns_found} campaigns on main page")
        else:
            print(f"Failed to access main campaigns page (Status code: {response.status_code})")
    except requests.exceptions.RequestException as e:
        print(f"Error accessing main campaigns page: {e}")
    
    print(f"Total campaigns (with duplicates): {len(all_campaigns)}")
    
    # Save both versions
    save_to_excel(all_campaigns)
    
    return all_campaigns

def save_to_excel(all_data):
    """
    Save both the full dataset and a deduplicated dataset with combined source categories
    """
    # Convert to pandas DataFrame
    df_all = pd.DataFrame(all_data)
    
    # Clean data types
    # Clean days to go - extract just the number
    df_all['Days to Go'] = df_all['Days to Go'].str.extract(r'(\d+)').astype('Int64')
    
    # Convert currency values to numeric (remove commas)
    df_all['Amount Raised'] = pd.to_numeric(df_all['Amount Raised'].str.replace(',', ''), errors='coerce')
    df_all['Target Amount'] = pd.to_numeric(df_all['Target Amount'].str.replace(',', ''), errors='coerce')
    
    # Add completion percentage column
    df_all['Completion Percentage'] = (df_all['Amount Raised'] / df_all['Target Amount'] * 100).round(2)
    
    # Save the full dataset with duplicates
    try:
        df_all.to_excel('ray_of_hope_campaigns_all.xlsx', index=False)
        print(f"Full data saved to ray_of_hope_campaigns_all.xlsx. Total campaigns: {len(df_all)}")
        df_all.to_csv('ray_of_hope_campaigns_all.csv', index=False)
    except Exception as e:
        print(f"Error saving full Excel file: {e}")
        df_all.to_csv('ray_of_hope_campaigns_all.csv', index=False)
        print("Full data saved as CSV instead.")
    
    # Create a deduplicated version with combined Source Categories
    # Group by URL and combine Source Categories
    url_groups = df_all.groupby('URL')
    
    # Create a list to hold our deduplicated records
    deduplicated_records = []
    
    for url, group in url_groups:
        if url == "Unknown":
            # Keep all unknown URL records as is
            for _, row in group.iterrows():
                deduplicated_records.append(row.to_dict())
            continue
        
        # Get the first record in the group
        first_record = group.iloc[0].to_dict()
        
        # Combine all source categories from this group
        all_source_categories = group['Source Category'].unique()
        first_record['Source Category'] = ', '.join(all_source_categories)
        
        # Add a count of appearances
        first_record['Category Appearances'] = len(group)
        
        # Add to our deduplicated records
        deduplicated_records.append(first_record)
    
    # Convert back to DataFrame
    df_unique = pd.DataFrame(deduplicated_records)
    
    # Sort by Categories Appearances to see which campaigns appear in most categories
    if 'Category Appearances' in df_unique.columns:
        df_unique = df_unique.sort_values('Category Appearances', ascending=False)
    
    # Save the deduplicated dataset
    try:
        df_unique.to_excel('ray_of_hope_campaigns_unique.xlsx', index=False)
        print(f"Unique data saved to ray_of_hope_campaigns_unique.xlsx. Total campaigns: {len(df_unique)}")
        df_unique.to_csv('ray_of_hope_campaigns_unique.csv', index=False)
    except Exception as e:
        print(f"Error saving unique Excel file: {e}")
        df_unique.to_csv('ray_of_hope_campaigns_unique.csv', index=False)
        print("Unique data saved as CSV instead.")

if __name__ == "__main__":
    print("Starting to scrape Ray of Hope campaigns...")
    all_campaigns = scrape_ray_of_hope()
    print("Scraping completed.")